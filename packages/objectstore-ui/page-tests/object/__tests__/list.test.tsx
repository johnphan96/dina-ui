import { QueryTable } from "common-ui";
import { PersistedResource } from "kitsu";
import MetadataListPage, {
  StoredObjectGallery
} from "../../../pages/object/list";
import { mountWithAppContext } from "../../../test-util/mock-app-context";
import { Metadata } from "../../../types/objectstore-api";

const TEST_METADATAS: Array<PersistedResource<Metadata>> = [
  {
    acTags: ["tag1"],
    bucket: "testbucket",
    dcType: "Image",
    fileExtension: ".png",
    fileIdentifier: "9a85b858-f8f0-4a97-99a8-07b2cb759766",
    id: "6c524135-3c3e-41c1-a057-45afb4e3e7be",
    type: "metadata"
  },
  {
    acTags: ["tag1", "tag2"],
    bucket: "testbucket",
    dcType: "Image",
    fileExtension: ".png",
    fileIdentifier: "72b4b907-c486-49a8-ab58-d01541d83eff",
    id: "3849de16-fee2-4bb1-990d-a4f5de19b48d",
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

const mockGet = jest.fn();
const apiContext: any = { apiClient: { get: mockGet } };

const mockPush = jest.fn();

jest.mock("next/router", () => ({
  useRouter: () => ({ push: mockPush })
}));

describe("Metadata List Page", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockGet.mockImplementation(async path => {
      if (path === "metadata") {
        return { data: TEST_METADATAS };
      }
    });
  });

  it("Renders the metadata table by default.", async () => {
    const wrapper = mountWithAppContext(<MetadataListPage />, { apiContext });

    await new Promise(setImmediate);
    wrapper.update();

    expect(
      wrapper
        .find(QueryTable)
        .find(".rt-td")
        .exists()
    ).toEqual(true);
  });

  it("Provides a toggle to see the gallery view.", async () => {
    const wrapper = mountWithAppContext(<MetadataListPage />, { apiContext });

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
    wrapper.find("button.metadata-bulk-edit-button").simulate("click");

    // Router push should have been called with the 3 IDs.
    expect(mockPush).lastCalledWith({
      pathname: "/metadata/edit",
      query: {
        ids:
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
    wrapper
      .find("button.preview-button")
      .first()
      .simulate("click");

    await new Promise(setImmediate);
    wrapper.update();

    // Preview section is visible:
    expect(wrapper.find(".preview-section").hasClass("col-4")).toEqual(true);
  });
});
