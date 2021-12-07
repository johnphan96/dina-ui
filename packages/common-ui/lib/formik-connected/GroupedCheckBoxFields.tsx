import { connect, Field } from "formik";
import { KitsuResource } from "kitsu";
import { noop, toPairs } from "lodash";
import { useRef, useState } from "react";
import { CommonMessage } from "../intl/common-ui-intl";
import { Tooltip } from "../tooltip/Tooltip";
import { useIntl } from "react-intl";

export interface CheckBoxFieldProps<TData extends KitsuResource> {
  resource: TData;
  fileHyperlinkId?: string;
}

export interface GroupedCheckBoxesParams<TData extends KitsuResource> {
  fieldName: string;
  detachTotalSelected?: boolean;
  defaultAvailableItems?: TData[];
}

export function useGroupedCheckBoxes<
  TData extends KitsuResource & { shortId }
>({
  fieldName,
  detachTotalSelected,
  defaultAvailableItems
}: GroupedCheckBoxesParams<TData>) {
  const [availableItems, setAvailableItems] = useState<TData[]>([]);
  const lastCheckedItemRef = useRef<TData>();
  const { formatMessage } = useIntl();

  function CheckBoxField({
    resource,
    fileHyperlinkId
  }: CheckBoxFieldProps<TData>) {
    const thisBoxFieldName = `${fieldName}[${resource.shortId ?? resource.id}]`;
    const computedAvailabelItems =
      (defaultAvailableItems as TData[]) ?? availableItems;

    return (
      <Field name={thisBoxFieldName}>
        {({ field: { value }, form: { setFieldValue, setFieldTouched } }) => {
          function onCheckBoxClick(e) {
            setFieldValue(thisBoxFieldName, e.target.checked);
            setFieldTouched(thisBoxFieldName);

            if (lastCheckedItemRef.current && e.shiftKey) {
              const checked: boolean = (e.target as any).checked;

              const currentIndex = computedAvailabelItems.indexOf(resource);
              const lastIndex = computedAvailabelItems.indexOf(
                lastCheckedItemRef.current
              );

              const [lowIndex, highIndex] = [currentIndex, lastIndex].sort(
                (a, b) => a - b
              );

              const itemsToToggle = computedAvailabelItems.slice(
                lowIndex,
                highIndex + 1
              );

              for (const item of itemsToToggle) {
                setFieldValue(`${fieldName}[${item.id}]`, checked);
              }
            }
            lastCheckedItemRef.current = resource;
          }

          return (
            <div className="d-flex w-100 h-100">
              <div className="mx-auto my-auto">
                <input
                  aria-labelledby={`select-column-header ${fileHyperlinkId}`}
                  checked={value || false}
                  onClick={onCheckBoxClick}
                  onChange={noop}
                  style={{
                    display: "block",
                    height: "20px",
                    width: "20px"
                  }}
                  type="checkbox"
                  value={value || false}
                />
              </div>
            </div>
          );
        }}
      </Field>
    );
  }

  const CheckAllCheckBox = connect(({ formik: { setFieldValue } }) => {
    function onCheckAllCheckBoxClick(e) {
      const { checked } = e.target;
      const computedAvailabelItems =
        (defaultAvailableItems as TData[]) ?? availableItems;

      for (const item of computedAvailabelItems) {
        setFieldValue(
          `${fieldName}[${item?.shortId ?? item.id}]`,
          checked || undefined
        );
      }
    }

    return (
      <input
        aria-label={formatMessage({ id: "checkAll" })}
        className="check-all-checkbox"
        onClick={onCheckAllCheckBoxClick}
        style={{ height: "20px", width: "20px", marginLeft: "5px" }}
        type="checkbox"
      />
    );
  });

  /** Table column header with a CheckAllCheckBox for the QueryTable. */
  const CheckBoxHeader = connect(({ formik: { values } }) => {
    const totalChecked = toPairs(values[fieldName]).filter(
      pair => pair[1]
    ).length;
    return (
      <div className="grouped-checkbox-header text-center">
        <div>
          <span id="select-column-header">
            <CommonMessage id="select" />
          </span>
          <CheckAllCheckBox />
          <Tooltip id="checkAllTooltipMessage" />
          {!detachTotalSelected && (
            <div>
              ({totalChecked} <CommonMessage id="selected" />)
            </div>
          )}
        </div>
      </div>
    );
  });

  const DetachedTotalSelected = connect(({ formik: { values } }) => {
    const totalChecked = toPairs(values[fieldName]).filter(
      pair => pair[1]
    ).length;
    return (
      <div>
        {totalChecked} <CommonMessage id="selected" />
      </div>
    );
  });

  return {
    CheckAllCheckBox,
    CheckBoxField,
    CheckBoxHeader,
    setAvailableItems,
    DetachedTotalSelected
  };
}
