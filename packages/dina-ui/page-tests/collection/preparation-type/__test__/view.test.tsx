import { PreparationTypeDetailsPage } from "../../../../pages/collection/preparation-type/view";
import { mountWithAppContext } from "../../../../test-util/mock-app-context";
import { PreparationType } from "../../../../types/collection-api/resources/PreparationType";

/** Test preparation-type with all fields defined. */
const TEST_PREPARATION_TYPE: PreparationType = {
  uuid: "617a27e2-8145-4077-a4a5-65af3de416d7",
  id: "1",
  name: "test preparation type",
  type: "preparation-type"
};

/** Mock Kitsu "get" method. */
const mockGet = jest.fn<any, any>(async model => {
  // The get request will return the existing preparation-type.
  if (model === "collection-api/preparation-type/100") {
    return { data: TEST_PREPARATION_TYPE };
  }
});

// Mock out the Link component, which normally fails when used outside of a Next app.
jest.mock("next/link", () => () => <div />);

// Mock API requests:
const apiContext = {
  apiClient: { get: mockGet }
};

describe("PreparationType details page", () => {
  it("Renders initially with a loading spinner.", () => {
    const wrapper = mountWithAppContext(
      <PreparationTypeDetailsPage router={{ query: { id: "100" } } as any} />,
      { apiContext }
    );

    expect(wrapper.find(".spinner-border").exists()).toEqual(true);
  });

  it("Render the PreparationType details", async () => {
    const wrapper = mountWithAppContext(
      <PreparationTypeDetailsPage router={{ query: { id: "100" } } as any} />,
      { apiContext }
    );

    // Wait for the page to load.
    await new Promise(setImmediate);
    wrapper.update();

    expect(wrapper.find(".spinner-border").exists()).toEqual(false);

    expect(wrapper.find(".name-field .field-view").text()).toEqual(
      "test preparation type"
    );
  });
});
