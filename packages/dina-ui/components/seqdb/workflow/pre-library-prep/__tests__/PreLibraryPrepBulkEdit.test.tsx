import { PersistedResource } from "kitsu";
import { mountWithAppContext } from "../../../../../test-util/mock-app-context";
import {
  Chain,
  ChainStepTemplate,
  ChainTemplate,
  MolecularSample,
  StepResource,
  StepTemplate
} from "../../../../../types/seqdb-api";
import { PreLibraryPrepBulkEdit } from "../PreLibraryPrepBulkEdit";

// Mock out the Link component, which normally fails when used outside of a Next app.
jest.mock("next/link", () => ({ children }) => <div>{children}</div>);

// Mock out the HandsOnTable which should only be rendered in the browser.
jest.mock("next/dynamic", () => () => {
  return function MockHotTable() {
    return <div>Mock Handsontable</div>;
  };
});

const TEST_SAMPLES = [
  { id: "1", type: "molecular-sample", name: "test sample 1" },
  { id: "2", type: "molecular-sample", name: "test sample 2" },
  { id: "3", type: "molecular-sample", name: "test sample 3" },
  { id: "4", type: "molecular-sample", name: "test sample 4" },
  { id: "5", type: "molecular-sample", name: "test sample 5" }
] as PersistedResource<MolecularSample>[];

const TEST_SAMPLE_STEP_RESOURCES: PersistedResource<StepResource>[] = [
  {
    id: "1",
    molecularSample: TEST_SAMPLES[0],
    type: "step-resource"
  } as PersistedResource<StepResource>,
  {
    id: "2",
    molecularSample: TEST_SAMPLES[1],
    type: "step-resource"
  } as PersistedResource<StepResource>,
  {
    id: "3",
    molecularSample: TEST_SAMPLES[2],
    type: "step-resource"
  } as PersistedResource<StepResource>,
  {
    id: "4",
    molecularSample: TEST_SAMPLES[3],
    type: "step-resource"
  } as PersistedResource<StepResource>,
  {
    id: "5",
    molecularSample: TEST_SAMPLES[4],
    type: "step-resource"
  } as PersistedResource<StepResource>
];

const TEST_CHAIN_TEMPLATE: PersistedResource<ChainTemplate> = {
  id: "1",
  name: "WGS",
  type: "chain-template"
};

const TEST_CHAIN: PersistedResource<Chain> = {
  chainTemplate: TEST_CHAIN_TEMPLATE,
  createdOn: "2019-01-01",
  id: "1",
  name: "Mat's chain",
  type: "chain"
};

/** This is the first step in the chain that precedes this one. */
const TEST_SAMPLE_SELECTION_CHAIN_STEP_TEMPLATE: PersistedResource<ChainStepTemplate> =
  {
    chainTemplate: TEST_CHAIN_TEMPLATE,
    id: "1",
    stepNumber: 1,
    stepTemplate: {
      id: "1",
      type: "step-template"
    } as PersistedResource<StepTemplate>,
    type: "chain-step-template"
  };

/** This is the second and current step in the chain. */
const TEST_PRE_LIBRARY_PREP_CHAIN_STEP_TEMPLATE: PersistedResource<ChainStepTemplate> =
  {
    chainTemplate: TEST_CHAIN_TEMPLATE,
    id: "2",
    stepNumber: 2,
    stepTemplate: {
      id: "2",
      type: "step-template"
    } as PersistedResource<StepTemplate>,
    type: "chain-step-template"
  };

const TEST_CHAIN_STEP_TEMPLATES = [
  TEST_SAMPLE_SELECTION_CHAIN_STEP_TEMPLATE,
  TEST_PRE_LIBRARY_PREP_CHAIN_STEP_TEMPLATE
];

const mockGet = jest.fn();
const mockPatch = jest.fn();

const apiContext: any = {
  apiClient: { get: mockGet, axios: { patch: mockPatch } }
};

function getWrapper() {
  return mountWithAppContext(
    <PreLibraryPrepBulkEdit
      chain={TEST_CHAIN}
      chainStepTemplates={TEST_CHAIN_STEP_TEMPLATES}
      step={TEST_PRE_LIBRARY_PREP_CHAIN_STEP_TEMPLATE}
    />,
    { apiContext }
  );
}

describe("PreLibraryPrepStep UI", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    /** Mock Kitsu "get" method. */
    mockGet.mockImplementation(async (path, params) => {
      if (path === "seqdb-api/step-resource") {
        if (params.include === "molecularSample") {
          return { data: TEST_SAMPLE_STEP_RESOURCES };
        } else if (params.include.includes("molecularSample,preLibraryPrep")) {
          return { data: [] };
        }
      } else {
        return { data: [] };
      }
    });

    /** Mock axios for operations requests. */
    mockPatch.mockImplementation(async (_, __) => ({ data: [] }));
  });

  it("Renders the samples from the list", async () => {
    const wrapper = getWrapper();

    // Await initial queries.
    await new Promise(setImmediate);
    wrapper.update();

    const tableData = wrapper.find("MockHotTable").prop<any[]>("data");

    expect(tableData[0].sampleStepResource.molecularSample.name).toEqual(
      "test sample 1"
    );
  });

  it("Lets you add shearing details for the checked samples.", async () => {
    const wrapper = getWrapper();

    // Await initial queries.
    await new Promise(setImmediate);
    wrapper.update();

    // Add the preLibraryPrep details.
    const tableData = wrapper.find("MockHotTable").prop<any[]>("data");

    tableData[1].plpStepResource = { preLibraryPrep: { inputAmount: 1234 } };
    tableData[1].protocol = "test protocol (protocol/1)";
    tableData[1].product = "test product (product/1)";

    // Assume there are no stepresources for these samples,
    // so this form submit creates 3 stepResources and does not edit existing ones.
    mockPatch.mockImplementation(async (_, operations) => {
      if (operations[0].path === "pre-library-prep") {
        return {
          data: [
            {
              data: {
                attributes: {
                  preLibraryPrepType: "SHEARING"
                },
                id: "2",
                type: "pre-library-prep"
              },
              status: 201
            }
          ]
        };
      }
      if (operations[0].path === "step-resource") {
        return {
          data: [{ status: 201, data: { id: "12", type: "step-resource" } }]
        };
      }
    });

    // Submit the bulk editor:
    wrapper.find("button.bulk-editor-submit-button").simulate("click");
    // Await form submit.
    await new Promise(setImmediate);

    // There should have been two patch calls:
    // One to add the prelibrarypreps
    // and one to add the stepResources.
    expect(mockPatch).toHaveBeenCalledTimes(2);

    const [prepCall, stepResourceCall] = mockPatch.mock.calls;

    // There should have been 1 prep created.
    expect(prepCall).toEqual([
      "/seqdb-api/operations",
      [
        {
          op: "POST",
          path: "pre-library-prep",
          value: {
            attributes: {
              inputAmount: 1234,
              preLibraryPrepType: "SHEARING"
            },
            id: "00000000-0000-0000-0000-000000000000",
            relationships: {
              product: {
                data: {
                  id: "1",
                  type: "product"
                }
              },
              protocol: {
                data: {
                  id: "1",
                  type: "protocol"
                }
              }
            },
            type: "pre-library-prep"
          }
        }
      ],
      expect.anything()
    ]);

    // There should have been 3 step resources created.
    expect(stepResourceCall).toEqual([
      "/seqdb-api/operations",
      [
        {
          op: "POST",
          path: "step-resource",
          value: {
            attributes: {
              value: "SHEARING"
            },
            id: "00000000-0000-0000-0000-000000000000",
            relationships: {
              chain: {
                data: {
                  id: "1",
                  type: "chain"
                }
              },
              chainStepTemplate: {
                data: {
                  id: "2",
                  type: "chain-step-template"
                }
              },
              preLibraryPrep: {
                data: {
                  id: "2",
                  type: "pre-library-prep"
                }
              },
              molecularSample: {
                data: {
                  id: "2",
                  type: "molecular-sample"
                }
              }
            },
            type: "step-resource"
          }
        }
      ],
      expect.anything()
    ]);
  });

  it("Does nothing if you submit the form without checking any sample checkboxes.", async () => {
    const wrapper = getWrapper();

    // Await initial queries.
    await new Promise(setImmediate);
    wrapper.update();

    // Submit the bulk editor:
    wrapper.find("button.bulk-editor-submit-button").simulate("click");
    // Await form submit.
    await new Promise(setImmediate);

    // There should have been two empty operations calls.
    expect(mockPatch.mock.calls).toEqual([
      ["/seqdb-api/operations", [], expect.anything()],
      ["/seqdb-api/operations", [], expect.anything()]
    ]);
  });

  it("Shows different view modes for the shearing and size selection details", async () => {
    mockGet.mockImplementation(async (path, params) => {
      // The request for the sample stepResources.
      if (
        path === "seqdb-api/step-resource" &&
        params.include === "molecularSample"
      ) {
        return {
          data: [
            {
              id: "5",
              type: "step-resource",
              molecularSample: { id: "10", type: "molecular-sample" }
            }
          ]
        };
      }

      // The request for the preLibraryPrep stepResources; There should be a prelibraryprep with
      // an inputAmount for the sample.
      if (
        path === "seqdb-api/step-resource" &&
        params.include.includes("molecularSample,preLibraryPrep")
      ) {
        return {
          data: [
            {
              id: "100",
              preLibraryPrep: {
                id: "200",
                inputAmount: 999,
                type: "pre-library-prep"
              },
              molecularSample: { id: "10", type: "molecular-sample" },
              type: "step-resource",
              value: "SIZE_SELECTION"
            }
          ]
        };
      }

      return { data: [] };
    });

    const wrapper = getWrapper();

    // Await initial queries.
    await new Promise(setImmediate);
    wrapper.update();

    wrapper.find("li.react-tabs__tab.SIZE_SELECTION-toggle").simulate("click");

    await new Promise(setImmediate);
    wrapper.update();

    const tableData = wrapper.find("MockHotTable").prop<any[]>("data");

    expect(tableData[0].plpStepResource.preLibraryPrep.inputAmount).toEqual(
      999
    );
  });
});
