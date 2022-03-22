import {
  AreYouSureModal,
  BulkDeleteButton,
  BulkSelectableFormValues,
  DinaForm,
  QueryPage
} from "common-ui";
import { PersistedResource } from "kitsu";
import { Group } from "../../../../types/user-api";
import { StoredObjectGallery } from "../../../../components/object-store";
import MetadataListPage from "../../../../pages/object-store/object/list";
import { mountWithAppContext } from "../../../../test-util/mock-app-context";
import { Metadata, Person } from "../../../../types/objectstore-api";
import { ObjectUpload } from "../../../../types/objectstore-api/resources/ObjectUpload";

const TEST_PERSON: PersistedResource<Person> = {
  id: "31ee7848-b5c1-46e1-bbca-68006d9eda3b",
  type: "person",
  displayName: "test agent"
};

const TEST_GROUP: PersistedResource<Group>[] = [
  {
    id: "31ee7848-b5c1-46e1-bbca-68006d9eda3b",
    type: "group",
    name: "test group",
    path: " test path",
    labels: { fr: "CNCFR" }
  }
];

const MOCK_INDEX_MAPPING_RESP = {
  data: {
    body: {
      indexName: "dina_object_store_index",
      attributes: [
        {
          name: "originalFilename",
          type: "text",
          path: "data.attributes"
        },
        {
          name: "bucket",
          type: "text",
          path: "data.attributes"
        },
        {
          name: "createdBy",
          type: "text",
          path: "data.attributes"
        },
        {
          name: "acCaption",
          type: "text",
          path: "data.attributes"
        },
        {
          name: "id",
          type: "text",
          path: "data"
        },
        {
          name: "type",
          type: "text",
          path: "data"
        },
        {
          name: "createdOn",
          type: "date",
          path: "data.attributes"
        }
      ],
      relationships: {
        type: "text",
        attributes: []
      }
    },
    statusCode: "OK",
    statusCodeValue: 200
  }
};

const mockGet = jest.fn<any, any>(async path => {
  switch (path) {
    case "objectstore-api/metadata":
      return { data: TEST_METADATAS };
    case "objectstore-api/object-upload":
      return { data: TEST_OBJECTUPLOAD };
    case "agent-api/person":
      return { data: TEST_PERSON };
    case "search-api/search-ws/mapping":
      return MOCK_INDEX_MAPPING_RESP;
    case "user-api/group":
      return TEST_GROUP;
  }
});

const mockPost = jest.fn<any, any>(async path => {
  switch (path) {
    case "search-api/search-ws/search":
      return TEST_ELASTIC_SEARCH_RESPONSE;
  }
});

// This will be used in the future with the fallback.
const TEST_METADATAS: PersistedResource<Metadata>[] = [
  {
    acTags: ["tag1"],
    bucket: "testbucket",
    dcType: "Image",
    fileExtension: ".png",
    fileIdentifier: "9a85b858-f8f0-4a97-99a8-07b2cb759766",
    id: "6c524135-3c3e-41c1-a057-45afb4e3e7be",
    originalFilename: "file1.png",
    type: "metadata"
  },
  {
    acTags: ["tag1", "tag2"],
    bucket: "testbucket",
    dcType: "Image",
    fileExtension: ".png",
    fileIdentifier: "72b4b907-c486-49a8-ab58-d01541d83eff",
    id: "3849de16-fee2-4bb1-990d-a4f5de19b48d",
    originalFilename: "file2.png",
    type: "metadata"
  },
  {
    bucket: "testbucket",
    dcType: "Image",
    fileExtension: ".png",
    fileIdentifier: "54bc37d7-17c4-4f70-8b33-2def722c6e97",
    id: "31ee7848-b5c1-46e1-bbca-68006d9eda3b",
    type: "metadata"
  }
];

const TEST_ELASTIC_SEARCH_RESPONSE = {
  data: {
    hits: {
      total: {
        value: 3
      },
      hits: [
        {
          _source: {
            data: {
              id: "6c524135-3c3e-41c1-a057-45afb4e3e7be",
              type: "metadata",
              attributes: {
                acTags: ["tag1"],
                bucket: "testbucket",
                dcType: "Image",
                fileExtension: ".png",
                fileIdentifier: "9a85b858-f8f0-4a97-99a8-07b2cb759766",
                originalFilename: "file1.png"
              }
            }
          }
        },
        {
          _source: {
            data: {
              id: "3849de16-fee2-4bb1-990d-a4f5de19b48d",
              type: "metadata",
              attributes: {
                acTags: ["tag1", "tag2"],
                bucket: "testbucket",
                dcType: "Image",
                fileExtension: ".png",
                fileIdentifier: "72b4b907-c486-49a8-ab58-d01541d83eff",
                originalFilename: "file2.png"
              }
            }
          }
        },
        {
          _source: {
            data: {
              id: "31ee7848-b5c1-46e1-bbca-68006d9eda3b",
              type: "metadata",
              attributes: {
                bucket: "testbucket",
                dcType: "Image",
                fileExtension: ".png",
                fileIdentifier: "54bc37d7-17c4-4f70-8b33-2def722c6e97"
              }
            }
          }
        }
      ]
    }
  }
};

const exifData = new Map().set("date original created", "2000, Jan 8");
const TEST_OBJECTUPLOAD: PersistedResource<ObjectUpload> = {
  id: "31ee7848-b5c1-46e1-bbca-68006d9eda3b",
  fileIdentifier: "54bc37d7-17c4-4f70-8b33-2def722c6e97",
  sizeInBytes: 500,
  originalFilename: "test.png",
  metaFileEntryVersion: "1",
  sha1Hex: "da39a3ee5e6b4b0d3255bfef95601890afd80709",
  receivedMediaType: "image/png",
  detectedMediaType: "image/png",
  detectedFileExtension: "png",
  evaluatedMediaType: "image/png",
  evaluatedFileExtension: "png",
  exif: Object.fromEntries(exifData),
  type: "object-upload"
};

const mockDoOperations = jest.fn();

const apiContext: any = {
  apiClient: {
    get: mockGet,
    axios: {
      get: mockGet,
      post: mockPost
    }
  },
  doOperations: mockDoOperations
};

const mockPush = jest.fn();
const mockReload = jest.fn();

jest.mock("next/router", () => ({
  useRouter: () => ({ push: mockPush, reload: mockReload })
}));

describe("Metadata List Page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("Renders the metadata table by default.", async () => {
    const wrapper = mountWithAppContext(<MetadataListPage />, { apiContext });

    await new Promise(setImmediate);
    wrapper.update();

    expect(wrapper.find(QueryPage).find(".rt-td").exists()).toEqual(true);
  });

  it("Provides a toggle to see the gallery view.", async () => {
    const wrapper = mountWithAppContext(<MetadataListPage />, { apiContext });

    // Renders initially with the table view:
    expect(
      wrapper
        .find(".list-layout-selector .list-inline-item")
        .findWhere(node => node.text().includes("Table"))
        .find("input")
        .prop("checked")
    ).toEqual(true);

    await new Promise(setImmediate);
    wrapper.update();

    // Switch to gallery view.
    wrapper
      .find(".list-layout-selector .list-inline-item")
      .findWhere(node => node.text().includes("Gallery"))
      .find("input")
      .prop<any>("onChange")();

    await new Promise(setImmediate);
    wrapper.update();

    expect(wrapper.find(StoredObjectGallery).exists()).toEqual(true);
  });

  it("Lets you select a list of metadatas and route to the edit page.", async () => {
    const wrapper = mountWithAppContext(<MetadataListPage />, { apiContext });

    await new Promise(setImmediate);
    wrapper.update();

    // Select all 3 metadatas to edit.
    wrapper.find(".grouped-checkbox-header input").prop<any>("onClick")({
      target: { checked: true }
    });

    // Click the bulk edit button:
    wrapper.find("button.bulk-edit-button").simulate("click");

    // Router push should have been called with the 3 IDs.
    expect(mockPush).lastCalledWith({
      pathname: "/object-store/metadata/edit",
      query: {
        metadataIds:
          "6c524135-3c3e-41c1-a057-45afb4e3e7be,3849de16-fee2-4bb1-990d-a4f5de19b48d,31ee7848-b5c1-46e1-bbca-68006d9eda3b"
      }
    });
  });

  it("Shows a metadata preview when you click the 'Preview' button.", async () => {
    const wrapper = mountWithAppContext(<MetadataListPage />, { apiContext });

    // Preview section is initially hidden:
    expect(wrapper.find(".preview-section").hasClass("col-0")).toEqual(true);

    await new Promise(setImmediate);
    wrapper.update();

    // Click the preview button:
    wrapper.find("button.preview-button").first().simulate("click");

    await new Promise(setImmediate);
    wrapper.update();

    // Preview section is visible:
    expect(wrapper.find(".preview-section").hasClass("col-4")).toEqual(true);
  });

  it("Disables the bulk edit button when no Metadatas are selected.", async () => {
    const wrapper = mountWithAppContext(<MetadataListPage />, { apiContext });

    await new Promise(setImmediate);
    wrapper.update();

    // Disabled initially because none are selected:
    expect(wrapper.find("button.bulk-edit-button").prop("disabled")).toEqual(
      true
    );

    // Select all 3 Metadatas to edit.
    wrapper.find(".grouped-checkbox-header input").prop<any>("onClick")({
      target: { checked: true }
    });
    await new Promise(setImmediate);
    wrapper.update();

    // The button should now be enabled:
    expect(wrapper.find("button.bulk-edit-button").prop("disabled")).toEqual(
      false
    );

    // Deselect all 3 Metadatas.
    wrapper.find(".grouped-checkbox-header input").prop<any>("onClick")({
      target: { checked: false }
    });
    await new Promise(setImmediate);
    wrapper.update();

    // The button should now be disabled again:
    expect(wrapper.find("button.bulk-edit-button").prop("disabled")).toEqual(
      true
    );
  });

  it("Lets you bulk-delete metadata.", async () => {
    const pageWrapper = mountWithAppContext(<MetadataListPage />, {
      apiContext
    });
    expect(pageWrapper.find("bulk-delete-button").exists());

    // Pretend two metadatas are already selected:
    const buttonWrapper = mountWithAppContext(
      <DinaForm<BulkSelectableFormValues>
        initialValues={{
          selectedResources: {
            "00000000-0000-0000-0000-000000000000": true,
            "11111111-1111-1111-1111-111111111111": true
          }
        }}
      >
        <BulkDeleteButton typeName="metadata" apiBaseUrl="/objectstore-api" />
      </DinaForm>,
      { apiContext }
    );

    // Click the bulk-delete button:
    buttonWrapper.find("button").simulate("click");

    buttonWrapper.update();

    // Shows how many will be deleted:
    expect(
      buttonWrapper.find(AreYouSureModal).find(".modal-header").text()
    ).toEqual("Delete Selected (2)");

    // Click 'yes' on the "Are you sure" modal:
    buttonWrapper.find(AreYouSureModal).find("form").simulate("submit");

    await new Promise(setImmediate);
    buttonWrapper.update();

    expect(mockDoOperations).toHaveBeenCalledTimes(1);
    expect(mockDoOperations).lastCalledWith(
      [
        {
          op: "DELETE",
          path: "metadata/00000000-0000-0000-0000-000000000000"
        },
        {
          op: "DELETE",
          path: "metadata/11111111-1111-1111-1111-111111111111"
        }
      ],
      {
        apiBaseUrl: "/objectstore-api"
      }
    );
    expect(mockReload).toHaveBeenCalledTimes(1);
  });
});
