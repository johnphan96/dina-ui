import { ApiClientContext } from "common-ui";
import { mount } from "enzyme";
import {
  Chain,
  ChainStepTemplate,
  ChainTemplate,
  LibraryPool,
  LibraryPoolContent,
  LibraryPrepBatch,
  StepResource,
  StepTemplate
} from "../../../../types/seqdb-api";
import { LibraryPoolingStep } from "../LibraryPoolingStep";

const TEST_CHAIN_TEMPLATE: ChainTemplate = {
  id: "1",
  name: "WGS Pooling",
  type: "chainTemplate"
};

const TEST_CHAIN: Chain = {
  chainTemplate: TEST_CHAIN_TEMPLATE,
  dateCreated: "2019-01-01",
  id: "1",
  name: "Mat's pooling chain",
  type: "chain"
};

const TEST_POOLING_CHAIN_STEP_TEMPLATE: ChainStepTemplate = {
  chainTemplate: TEST_CHAIN_TEMPLATE,
  id: "2",
  stepNumber: 2,
  stepTemplate: { id: "2", type: "stepTemplate" } as StepTemplate,
  type: "chainStepTemplate"
};

const TEST_CHAIN_STEP_TEMPLATES = [TEST_POOLING_CHAIN_STEP_TEMPLATE];

const TEST_LIBRARY_PREP_BATCHS: LibraryPrepBatch[] = [
  {
    id: "1",
    name: "test batch 1",
    type: "libraryPrepBatch"
  },
  {
    id: "2",
    name: "test batch 2",
    type: "libraryPrepBatch"
  },
  {
    id: "3",
    name: "test batch 3",
    type: "libraryPrepBatch"
  }
];

const TEST_LIBRARY_POOLS: LibraryPool[] = [
  {
    id: "1",
    name: "test pool 1",
    type: "libraryPool"
  },
  {
    id: "2",
    name: "test pool 2",
    type: "libraryPool"
  },
  {
    id: "3",
    name: "test pool 3",
    type: "libraryPool"
  }
];

const TEST_LIBRARY_POOL_STEPRESOURCE: StepResource = {
  chain: TEST_CHAIN,
  chainStepTemplate: TEST_POOLING_CHAIN_STEP_TEMPLATE,
  libraryPool: {
    id: "100",
    name: "test pool",
    type: "libraryPool"
  },
  type: "stepResource",
  value: "LIBRARY_POOL"
};

const TEST_LIBRARY_POOL_CONTENTS: LibraryPoolContent[] = [
  {
    id: "6",
    libraryPool: TEST_LIBRARY_POOL_STEPRESOURCE.libraryPool as LibraryPool,
    pooledLibraryPool: TEST_LIBRARY_POOLS[0],
    type: "libraryPoolContent"
  },
  {
    id: "7",
    libraryPool: TEST_LIBRARY_POOL_STEPRESOURCE.libraryPool as LibraryPool,
    pooledLibraryPool: TEST_LIBRARY_POOLS[1],
    type: "libraryPoolContent"
  },
  {
    id: "8",
    libraryPool: TEST_LIBRARY_POOL_STEPRESOURCE.libraryPool as LibraryPool,
    pooledLibraryPrepBatch: TEST_LIBRARY_PREP_BATCHS[0],
    type: "libraryPoolContent"
  }
];

const mockGet = jest.fn();
const mockSave = jest.fn();
const mockDoOperations = jest.fn();

const mockCtx = {
  apiClient: {
    get: mockGet
  },
  doOperations: mockDoOperations,
  save: mockSave
};

function getWrapper() {
  return mount(
    <ApiClientContext.Provider value={mockCtx as any}>
      <LibraryPoolingStep
        chain={TEST_CHAIN}
        chainStepTemplates={TEST_CHAIN_STEP_TEMPLATES}
        step={TEST_POOLING_CHAIN_STEP_TEMPLATE}
      />
    </ApiClientContext.Provider>
  );
}

describe("LibraryPoolingStep component", () => {
  beforeEach(() => {
    jest.resetAllMocks();

    /** Mock Kitsu "get" method. */
    mockGet.mockImplementation(async model => {
      if (model === "libraryPrepBatch") {
        return { data: TEST_LIBRARY_PREP_BATCHS };
      } else if (model === "libraryPool") {
        return { data: TEST_LIBRARY_POOLS };
      } else if (model === "stepResource") {
        return { data: [TEST_LIBRARY_POOL_STEPRESOURCE] };
      } else if (model === "libraryPool/100/contents") {
        return { data: TEST_LIBRARY_POOL_CONTENTS };
      } else {
        return { data: [] };
      }
    });

    mockSave.mockImplementation(async ops => {
      return ops.map(op => op.resource);
    });
  });

  it("Renders the available library prep batchs and pools", async () => {
    const wrapper = getWrapper();

    // Await initial queries.
    await new Promise(setImmediate);
    wrapper.update();

    // The library prep batch table should render.
    expect(
      wrapper
        .find(
          ".library-pool-content-selection-table .rt-td[children='test batch 2']"
        )
        .exists()
    ).toEqual(true);

    // Switch to the library pools tab:
    wrapper
      .find("li.react-tabs__tab[children='Library Pools']")
      .simulate("click");

    // Await library pool query.
    await new Promise(setImmediate);
    wrapper.update();

    // The library pool table should render.
    expect(
      wrapper
        .find(
          ".library-pool-content-selection-table .rt-td[children='test pool 2']"
        )
        .exists()
    ).toEqual(true);

    // The library pool content table should render.
    expect(
      wrapper
        .find(".library-pool-content-table .rt-td[children='test pool 1']")
        .exists()
    ).toEqual(true);
  });

  it("Lets you select library prep batchs as pooled libraries.", async () => {
    const wrapper = getWrapper();

    // Await initial queries.
    await new Promise(setImmediate);
    wrapper.update();

    // Select batchs 1 to 3.
    wrapper
      .find(
        ".library-pool-content-selection-table .rt-tbody input[type='checkbox']"
      )
      .at(0)
      .prop<any>("onClick")({ target: { checked: true } });
    wrapper.update();
    wrapper
      .find(
        ".library-pool-content-selection-table .rt-tbody input[type='checkbox']"
      )
      .at(2)
      .prop<any>("onClick")({
      shiftKey: true,
      target: { checked: true }
    });
    wrapper.update();

    wrapper.find("button.select-all-checked-button").simulate("click");

    await new Promise(setImmediate);
    wrapper.update();

    expect(mockSave.mock.calls).toEqual([
      [
        [
          {
            resource: {
              libraryPool: {
                id: "100",
                name: "test pool",
                type: "libraryPool"
              },
              pooledLibraryPool: null,
              pooledLibraryPrepBatch: {
                id: "1",
                type: "libraryPrepBatch"
              },
              type: "libraryPoolContent"
            },
            type: "libraryPoolContent"
          },
          {
            resource: {
              libraryPool: {
                id: "100",
                name: "test pool",
                type: "libraryPool"
              },
              pooledLibraryPool: null,
              pooledLibraryPrepBatch: {
                id: "2",
                type: "libraryPrepBatch"
              },
              type: "libraryPoolContent"
            },
            type: "libraryPoolContent"
          },
          {
            resource: {
              libraryPool: {
                id: "100",
                name: "test pool",
                type: "libraryPool"
              },
              pooledLibraryPool: null,
              pooledLibraryPrepBatch: {
                id: "3",
                type: "libraryPrepBatch"
              },
              type: "libraryPoolContent"
            },
            type: "libraryPoolContent"
          }
        ]
      ]
    ]);
  });

  it("Lets you deselect selected library pool contents.", async () => {
    const wrapper = getWrapper();

    // Await initial queries.
    await new Promise(setImmediate);
    wrapper.update();

    // Select contents 1 to 3.
    wrapper
      .find(".library-pool-content-table .rt-tbody input[type='checkbox']")
      .at(0)
      .prop<any>("onClick")({ target: { checked: true } });
    wrapper.update();
    wrapper
      .find(".library-pool-content-table .rt-tbody input[type='checkbox']")
      .at(2)
      .prop<any>("onClick")({
      shiftKey: true,
      target: { checked: true }
    });
    wrapper.update();

    wrapper.find("button.deselect-all-checked-button").simulate("click");

    await new Promise(setImmediate);
    wrapper.update();

    expect(mockDoOperations.mock.calls).toEqual([
      [
        [
          {
            op: "DELETE",
            path: "libraryPoolContent/6",
            value: {
              id: "6",
              type: "libraryPoolContent"
            }
          },
          {
            op: "DELETE",
            path: "libraryPoolContent/7",
            value: {
              id: "7",
              type: "libraryPoolContent"
            }
          },
          {
            op: "DELETE",
            path: "libraryPoolContent/8",
            value: {
              id: "8",
              type: "libraryPoolContent"
            }
          }
        ]
      ]
    ]);
  });

  it("Renders the library pool details form when there is no existing library pool for this workflow", async () => {
    // Don't return the library pool step resource:
    mockGet.mockImplementation(async model => {
      if (model === "libraryPrepBatch") {
        return { data: TEST_LIBRARY_PREP_BATCHS };
      } else if (model === "libraryPool") {
        return { data: TEST_LIBRARY_POOLS };
      } else if (model === "stepResource") {
        return { data: [] };
      } else {
        return { data: [] };
      }
    });

    const wrapper = getWrapper();

    // Await initial queries.
    await new Promise(setImmediate);
    wrapper.update();

    // Change the name:
    wrapper
      .find(".name-field")
      .find("input")
      .simulate("change", {
        target: { name: "name", value: "edited name" }
      });

    // Return a library pool step resource:
    mockGet.mockImplementation(async model => {
      if (model === "libraryPrepBatch") {
        return { data: TEST_LIBRARY_PREP_BATCHS };
      } else if (model === "libraryPool") {
        return { data: TEST_LIBRARY_POOLS };
      } else if (model === "stepResource") {
        return { data: [TEST_LIBRARY_POOL_STEPRESOURCE] };
      } else if (model === "libraryPool/100/contents") {
        return { data: TEST_LIBRARY_POOL_CONTENTS };
      } else {
        return { data: [] };
      }
    });

    wrapper.find("form").simulate("submit");

    await new Promise(setImmediate);
    wrapper.update();

    expect(wrapper.find(".name-field p").exists()).toEqual(true);
  });

  it("Provides a button to edit the existing library pool.", async () => {
    const wrapper = getWrapper();

    // Await initial queries:
    await new Promise(setImmediate);
    wrapper.update();

    wrapper
      .find("button[children='Edit Library Pool Details']")
      .simulate("click");

    await new Promise(setImmediate);
    wrapper.update();

    expect(wrapper.find(".name-field input").exists()).toEqual(true);
  });

  it("Lets you select a single library prep batch for pooling.", async () => {
    const wrapper = getWrapper();

    // Await initial queries:
    await new Promise(setImmediate);
    wrapper.update();

    wrapper
      .find(".library-pool-content-selection-table button.single-select-button")
      .first()
      .simulate("click");

    await new Promise(setImmediate);
    wrapper.update();

    expect(mockSave.mock.calls).toEqual([
      [
        [
          {
            resource: {
              libraryPool: {
                id: "100",
                name: "test pool",
                type: "libraryPool"
              },
              pooledLibraryPool: null,
              pooledLibraryPrepBatch: {
                id: "1",
                name: "test batch 1",
                type: "libraryPrepBatch"
              },
              type: "libraryPoolContent"
            },
            type: "libraryPoolContent"
          }
        ]
      ]
    ]);
  });

  it("Lets you select a single library pool for pooling.", async () => {
    const wrapper = getWrapper();

    // Await initial queries:
    await new Promise(setImmediate);
    wrapper.update();

    // Switch to the library pools tab:
    wrapper
      .find("li.react-tabs__tab[children='Library Pools']")
      .simulate("click");

    // Await pools query:
    await new Promise(setImmediate);
    wrapper.update();

    wrapper
      .find(".library-pool-content-selection-table button.single-select-button")
      .first()
      .simulate("click");

    await new Promise(setImmediate);
    wrapper.update();

    expect(mockSave.mock.calls).toEqual([
      [
        [
          {
            resource: {
              libraryPool: {
                id: "100",
                name: "test pool",
                type: "libraryPool"
              },
              pooledLibraryPool: {
                id: "1",
                name: "test pool 1",
                type: "libraryPool"
              },
              pooledLibraryPrepBatch: null,
              type: "libraryPoolContent"
            },
            type: "libraryPoolContent"
          }
        ]
      ]
    ]);
  });

  it("Lets you delete a single LibraryPoolContent", async () => {
    const wrapper = getWrapper();

    // Await initial queries:
    await new Promise(setImmediate);
    wrapper.update();

    wrapper
      .find(".library-pool-content-table button.single-remove-button")
      .first()
      .simulate("click");

    await new Promise(setImmediate);
    wrapper.update();

    expect(mockDoOperations.mock.calls).toEqual([
      [
        [
          {
            op: "DELETE",
            path: "libraryPoolContent/6",
            value: {
              id: "6",
              type: "libraryPoolContent"
            }
          }
        ]
      ]
    ]);
  });

  it("Lets you filter LibraryPrepBatchs and LibraryPools by name.", async () => {
    // Un-debounce the header filter's onChange function.
    jest
      .spyOn(require("lodash"), "debounce")
      .mockImplementation(fn => fn as any);

    const wrapper = getWrapper();

    // Await initial queries:
    await new Promise(setImmediate);
    wrapper.update();

    wrapper
      .find(
        ".library-pool-content-selection-table .rt-th input[placeholder='Search...']"
      )
      .prop<any>("onChange")({
      target: { name: "header-input", value: "test search name" }
    });

    // Await new queries:
    await new Promise(setImmediate);
    wrapper.update();

    // The name filter should be passed in:
    expect(mockGet).lastCalledWith("libraryPrepBatch", {
      filter: { rsql: "name=='*test search name*' and dateUsed==null" },
      page: { limit: 25, offset: 0 }
    });

    // Switch to the library pools tab:
    wrapper
      .find("li.react-tabs__tab[children='Library Pools']")
      .simulate("click");

    // Await pools query:
    await new Promise(setImmediate);
    wrapper.update();

    // The name filter should be passed in:
    expect(mockGet).lastCalledWith("libraryPool", {
      filter: {
        rsql:
          "libraryPoolId!=100 and name=='*test search name*' and dateUsed==null"
      },
      page: { limit: 25, offset: 0 }
    });
  });

  it("Lets you filter by used or not-used.", async () => {
    const wrapper = getWrapper();

    // Await initial queries:
    await new Promise(setImmediate);
    wrapper.update();

    wrapper.find("input.hide-used-checkbox").prop<any>("onChange")({
      target: { checked: "false" }
    } as any);

    // Await new query:
    await new Promise(setImmediate);
    wrapper.update();

    expect(mockGet).lastCalledWith("libraryPrepBatch", {
      filter: { rsql: "name=='**' " },
      page: { limit: 25, offset: 0 }
    });

    // Switch to the library pools tab:
    wrapper
      .find("li.react-tabs__tab[children='Library Pools']")
      .simulate("click");

    // Await pools query:
    await new Promise(setImmediate);
    wrapper.update();

    expect(mockGet).lastCalledWith("libraryPool", {
      filter: {
        rsql: "libraryPoolId!=100 and name=='**' "
      },
      page: { limit: 25, offset: 0 }
    });
  });
});
