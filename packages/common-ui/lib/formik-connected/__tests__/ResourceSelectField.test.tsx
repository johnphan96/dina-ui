import { Formik } from "formik";
import { KitsuResource } from "kitsu";
import lodash, { noop } from "lodash";
import Select from "react-select/base";
import { ResourceSelectField } from "../../";
import { mountWithAppContext } from "../../test-util/mock-app-context";

interface TestGroup extends KitsuResource {
  groupName: string;
}

const MOCK_GROUPS = {
  data: [
    { id: "1", type: "group", groupName: "Group 1" },
    { id: "2", type: "group", groupName: "Group 2" },
    { id: "3", type: "group", groupName: "Mat's Group" }
  ]
};

const MOCK_GROUPS_FILTERED = {
  data: [{ id: 3, type: "group", groupName: "Mat's Group" }]
};

/** Mock Kitsu "get" method. */
const mockGet = jest.fn(async (_, { filter }) => {
  if (filter?.groupName === "Mat") {
    return MOCK_GROUPS_FILTERED;
  }
  return MOCK_GROUPS;
});

const apiContext: any = { apiClient: { get: mockGet } };

// Mock out the debounce function to avoid waiting during tests.
jest.spyOn(lodash, "debounce").mockImplementation((fn: any) => fn);

describe("ResourceSelectField component", () => {
  it("Displays the Formik field's value.", () => {
    const wrapper = mountWithAppContext(
      <Formik
        initialValues={{ group: { id: "3", groupName: "Mat's Group" } }}
        onSubmit={noop}
      >
        <ResourceSelectField<TestGroup>
          name="group"
          model="group"
          filter={groupName => ({ groupName })}
          optionLabel={group => group.groupName}
        />
      </Formik>,
      { apiContext }
    );

    const { value } = wrapper.find(Select).props();

    expect(value).toEqual({
      label: "Mat's Group",
      resource: { groupName: "Mat's Group", id: "3" },
      value: "3"
    });
  });

  it("Changes the Formik field's value.", async () => {
    const wrapper = mountWithAppContext(
      <Formik initialValues={{ group: null }} onSubmit={noop}>
        {({ values: { group } }) => (
          <div>
            <ResourceSelectField<TestGroup>
              name="group"
              model="group"
              filter={groupName => ({ groupName })}
              /* tslint:disable-next-line */
              optionLabel={group => group.groupName}
            />
            <div id="value-display">{group && group.groupName}</div>
          </div>
        )}
      </Formik>,
      { apiContext }
    );

    // Wait for the options to load.
    await Promise.resolve();
    wrapper.update();

    // Simulate the select component's input change.
    (wrapper.find(Select).props() as any).onInputChange("Mat", "input-change");

    // Wait for the filtered options to load.
    await Promise.resolve();
    wrapper.update();

    // The "get" function should have been called with the filter.
    expect(mockGet).lastCalledWith("group", {
      filter: {
        groupName: "Mat"
      }
    });

    const { onChange, options } = wrapper.find(Select).props();

    const groupToSelect = options[0];

    // Simulate selecting a new option.
    onChange(groupToSelect, null);

    // The new selected group's name should be rendered into the value-display div.
    expect(wrapper.find("#value-display").text()).toEqual("Mat's Group");
  });

  it("Provides an onChange callback prop.", () => {
    const mockOnChange = jest.fn();

    const wrapper = mountWithAppContext(
      <Formik
        initialValues={{ group: { id: 3, groupName: "Mat's Group" } }}
        onSubmit={noop}
      >
        <ResourceSelectField<TestGroup>
          name="group"
          model="group"
          filter={groupName => ({ groupName })}
          optionLabel={group => group.groupName}
          onChange={mockOnChange}
        />
      </Formik>,
      { apiContext }
    );

    // Change the value.
    wrapper.find(Select).prop("onChange")(
      { resource: MOCK_GROUPS.data[1] },
      null
    );

    expect(mockOnChange).lastCalledWith({
      groupName: "Group 2",
      id: "2",
      type: "group"
    });
  });
});
