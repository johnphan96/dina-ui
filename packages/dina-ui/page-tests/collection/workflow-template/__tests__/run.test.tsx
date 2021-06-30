import { PersistedResource } from "kitsu";
import ReactSwitch from "react-switch";
import { CreateMaterialSampleFromWorkflowForm } from "../../../../pages/collection/workflow-template/run";
import { mountWithAppContext } from "../../../../test-util/mock-app-context";
import {
  CollectingEvent,
  PreparationProcessDefinition
} from "../../../../types/collection-api";
import { CoordinateSystem } from "../../../../types/collection-api/resources/CoordinateSystem";
import { SRS } from "../../../../types/collection-api/resources/SRS";

function testCollectionEvent(): Partial<CollectingEvent> {
  return {
    startEventDateTime: "2021-04-13",
    id: "555",
    type: "collecting-event",
    group: "test group"
  };
}

const TEST_SRS: SRS = {
  srs: ["NAD27 (EPSG:4276)", "WGS84 (EPSG:4326)"],
  type: "srs"
};

const TEST_COORDINATES: CoordinateSystem = {
  coordinateSystem: ["decimal degrees", " degrees decimal"],
  type: "coordinate-system"
};

const mockGet = jest.fn<any, any>(async path => {
  switch (path) {
    case "collection-api/collecting-event":
      // Populate the linker table:
      return { data: [testCollectionEvent()] };
    case "collection-api/collecting-event/2?include=collectors,attachment":
      return {
        data: {
          startEventDateTime: "2021-04-13",
          id: "2",
          type: "collecting-event",
          group: "test group"
        }
      };
    case "collection-api/collecting-event/555?include=collectors,attachment":
      return { data: testCollectionEvent() };
    case "collection-api/srs":
      return { data: [TEST_SRS] };
    case "collection-api/coordinate-system":
      return { data: [TEST_COORDINATES] };
    case "collection-api/preparation-type":
    case "collection-api/managed-attribute":
    case "user-api/group":
    case "agent-api/person":
    case "objectstore-api/metadata":
      return { data: [] };
  }
});

const mockBulkGet = jest.fn<any, any>(async paths => {
  if (!paths.length) {
    return [];
  }
});

const mockSave = jest.fn<any, any>(async saves => {
  return saves.map(save => {
    if (save.type === "material-sample") {
      return { ...save.resource, id: "1" };
    }
    if (save.type === "collecting-event") {
      return { ...save.resource, id: "2" };
    }
  });
});

const apiContext = {
  bulkGet: mockBulkGet,
  save: mockSave,
  apiClient: {
    get: mockGet
  }
};

const mockOnSaved = jest.fn();

async function getWrapper(
  actionDefinition?: PersistedResource<PreparationProcessDefinition>
) {
  const wrapper = mountWithAppContext(
    <CreateMaterialSampleFromWorkflowForm
      actionDefinition={
        actionDefinition ?? {
          id: "1",
          actionType: "ADD",
          formTemplates: {
            COLLECTING_EVENT: {
              allowExisting: true,
              allowNew: true,
              templateFields: {
                startEventDateTime: {
                  enabled: true,
                  defaultValue: "2019-12-21T16:00"
                },
                ...({
                  // On assertions only allow the lat/long fields:
                  "geoReferenceAssertions[0].dwcDecimalLatitude": {
                    enabled: true,
                    defaultValue: 1
                  },
                  "geoReferenceAssertions[0].dwcDecimalLongitude": {
                    enabled: true,
                    defaultValue: 2
                  }
                } as any)
              }
            },
            MATERIAL_SAMPLE: {
              allowExisting: true,
              allowNew: true,
              // Only show the Identifiers:
              templateFields: {}
            }
          },
          group: "test-group",
          name: "test-definition",
          type: "material-sample-action-definition"
        }
      }
      onSaved={mockOnSaved}
    />,
    { apiContext }
  );

  await new Promise(setImmediate);
  wrapper.update();

  return wrapper;
}

describe("CreateMaterialSampleFromWorkflowPage", () => {
  beforeEach(jest.clearAllMocks);

  it("Renders the Material Sample Form with the disabled/enabled fields and initial values", async () => {
    const wrapper = await getWrapper();

    // Identifiers fields are disabled:
    expect(wrapper.find(".materialSampleName-field input").exists()).toEqual(
      false
    );

    // Lat/Lng fields are enabled:
    expect(wrapper.find(".dwcDecimalLatitude input").prop("value")).toEqual(
      "1"
    );
    expect(wrapper.find(".dwcDecimalLongitude input").prop("value")).toEqual(
      "2"
    );

    // Uncertainty field is disabled:
    expect(
      wrapper.find(".dwcCoordinateUncertaintyInMeters input").exists()
    ).toEqual(false);

    // Preparation type is disabled:
    expect(wrapper.find(".preparationType-field Select").exists()).toEqual(
      false
    );

    // Edit the lat/lng:
    wrapper.find(".dwcDecimalLatitude NumberFormat").prop<any>("onValueChange")(
      { floatValue: 45.394728 }
    );
    wrapper
      .find(".dwcDecimalLongitude NumberFormat")
      .prop<any>("onValueChange")({ floatValue: -75.701452 });

    // Submit
    wrapper.find("form").simulate("submit");

    await new Promise(setImmediate);
    wrapper.update();

    expect(mockSave.mock.calls).toEqual([
      [
        [
          {
            resource: {
              dwcOtherRecordNumbers: null,
              geoReferenceAssertions: [
                {
                  georeferencedBy: undefined,
                  isPrimary: true,
                  // The added values:
                  dwcDecimalLatitude: 45.394728,
                  dwcDecimalLongitude: -75.701452
                }
              ],
              relationships: {},
              // The template's default value:
              startEventDateTime: "2019-12-21T16:00",
              type: "collecting-event"
            },
            type: "collecting-event"
          }
        ],
        {
          apiBaseUrl: "/collection-api"
        }
      ],
      [
        [
          {
            resource: {
              collectingEvent: {
                id: "2",
                type: "collecting-event"
              },

              // Preparations are not enabled, so the preparation fields are set to null:
              preparationDate: null,
              preparationType: {
                id: null,
                type: "preparation-type"
              },
              preparedBy: {
                id: null
              },
              managedAttributes: {},
              relationships: {},
              type: "material-sample"
            },
            type: "material-sample"
          }
        ],
        {
          apiBaseUrl: "/collection-api"
        }
      ]
    ]);

    expect(mockOnSaved).lastCalledWith("1");
  });

  it("Renders the Material Sample Form with a pre-attached Collecting Event.", async () => {
    const wrapper = await getWrapper({
      id: "1",
      actionType: "ADD",
      formTemplates: {
        COLLECTING_EVENT: {
          allowExisting: true,
          allowNew: true,
          templateFields: {
            id: {
              defaultValue: "555",
              enabled: true
            }
          }
        },
        MATERIAL_SAMPLE: {
          allowExisting: true,
          allowNew: true,
          // Explicitly enable no fields:
          templateFields: {}
        }
      },
      group: "test-group",
      name: "test-definition",
      type: "material-sample-action-definition"
    });

    // Identifiers fields are disabled:
    expect(wrapper.find(".materialSampleName-field input").exists()).toEqual(
      false
    );

    // Group field is enabled:
    expect(wrapper.find(".group-field input").exists()).toEqual(true);

    // Collecting Event field is set but the input is disabled:
    expect(
      wrapper.find(".startEventDateTime-field .field-view").text()
    ).toEqual("2021-04-13");
    expect(wrapper.find(".startEventDateTime-field input").exists()).toEqual(
      false
    );

    await wrapper.find("form").simulate("submit");

    await new Promise(setImmediate);
    wrapper.update();

    // Only the material sample is saved, and it's linked to the existing Collecting Event ID from the template:
    expect(mockSave.mock.calls).toEqual([
      [
        [
          {
            resource: {
              collectingEvent: {
                id: "555",
                type: "collecting-event"
              },

              // Preparations are not enabled, so the preparation fields are set to null:
              preparationDate: null,
              preparationType: {
                id: null,
                type: "preparation-type"
              },
              preparedBy: {
                id: null
              },
              managedAttributes: {},
              relationships: {},
              type: "material-sample"
            },
            type: "material-sample"
          }
        ],
        { apiBaseUrl: "/collection-api" }
      ]
    ]);
    expect(mockOnSaved).lastCalledWith("1");
  });

  it("Renders the Material Sample form with no template fields enabled.", async () => {
    const wrapper = await getWrapper({
      id: "1",
      actionType: "ADD",
      formTemplates: {},
      group: "test-group",
      name: "test-definition",
      type: "material-sample-action-definition"
    });

    // Both should be disabled:
    expect(
      wrapper.find(".enable-collecting-event").find(ReactSwitch).prop("checked")
    ).toEqual(false);
    expect(
      wrapper.find(".enable-catalogue-info").find(ReactSwitch).prop("checked")
    ).toEqual(false);

    // Submit with only the name set:
    await wrapper.find("form").simulate("submit");

    await new Promise(setImmediate);
    wrapper.update();

    // Only the material sample is saved, and it's linked to the existing Collecting Event ID from the template:
    expect(mockSave.mock.calls).toEqual([
      [
        [
          {
            resource: {
              collectingEvent: {
                id: null,
                type: "collecting-event"
              },
              managedAttributes: {},

              // Preparations are not enabled, so the preparation fields are set to null:
              preparationDate: null,
              preparationType: {
                id: null,
                type: "preparation-type"
              },
              preparedBy: {
                id: null
              },

              relationships: {},
              type: "material-sample"
            },
            type: "material-sample"
          }
        ],
        {
          apiBaseUrl: "/collection-api"
        }
      ]
    ]);
  });

  it("Renders the Material Sample form with only the Preparation section enabled.", async () => {
    const wrapper = await getWrapper({
      id: "1",
      actionType: "ADD",
      formTemplates: {
        MATERIAL_SAMPLE: {
          allowExisting: true,
          allowNew: true,
          templateFields: {
            preparedBy: {
              defaultValue: null,
              enabled: true
            }
          }
        }
      },
      group: "test-group",
      name: "test-definition",
      type: "material-sample-action-definition"
    });

    // Only the Preparation section should be enabled:
    expect(
      wrapper.find(".enable-collecting-event").find(ReactSwitch).prop("checked")
    ).toEqual(false);
    expect(
      wrapper.find(".enable-catalogue-info").find(ReactSwitch).prop("checked")
    ).toEqual(true);
  });

  it("Renders the Material Sample form with only the Collecting Event section enabled.", async () => {
    const wrapper = await getWrapper({
      id: "1",
      actionType: "ADD",
      formTemplates: {
        COLLECTING_EVENT: {
          allowExisting: true,
          allowNew: true,
          templateFields: {
            startEventDateTime: {
              defaultValue: null,
              enabled: true
            }
          }
        }
      },
      group: "test-group",
      name: "test-definition",
      type: "material-sample-action-definition"
    });

    // Only the Collecting Event section should be enabled:
    expect(
      wrapper.find(".enable-collecting-event").find(ReactSwitch).prop("checked")
    ).toEqual(true);
    expect(
      wrapper.find(".enable-catalogue-info").find(ReactSwitch).prop("checked")
    ).toEqual(false);
  });
});
