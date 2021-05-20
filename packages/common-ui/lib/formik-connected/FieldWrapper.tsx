import { FastField, FormikProps } from "formik";
import { ReactNode } from "react";
import { FieldHeader } from "../field-header/FieldHeader";
import { useDinaFormContext } from "./DinaForm";
import { ReadOnlyValue } from "./FieldView";

export interface LabelWrapperParams {
  /** The CSS classes of the div wrapper. */
  className?: string;

  /** Hides the label. */
  hideLabel?: boolean;

  /** The name of the field. */
  name: string;

  /** The label for the field. */
  label?: ReactNode;

  /** Override the default "name" prop used to get labels and tooltips from the intl messages. */
  customName?: string;

  /** Link href to render for a single string value. */
  link?: string;

  /** Custom element to render when the form is in read-only mode. */
  readOnlyRender?: (value: any) => ReactNode;

  removeFormGroupClass?: boolean;

  /** Remove the label. */
  removeLabel?: boolean;
}

export interface FieldWrapperProps extends LabelWrapperParams {
  children?:
    | JSX.Element
    | ((renderProps: FieldWrapperRenderProps) => JSX.Element);
}

export interface FieldWrapperRenderProps {
  value: any;
  setValue: (newValue: any) => void;
  formik: FormikProps<any>;
}

/**
 * Wraps a field with a label of the field's name and Formik's FastField. The label can be auto-generated as a title-case
 * version of the field name, or can be specified as a custom label string.
 *
 * This component also wraps the field in a div with the className `${fieldName}-field` for testing purposes.
 * e.g. select the "description" text input using wrapper.find(".description-field input").
 */
export function FieldWrapper({
  className,
  hideLabel = false,
  name,
  label,
  children,
  customName,
  link,
  readOnlyRender,
  removeFormGroupClass,
  removeLabel
}: FieldWrapperProps) {
  const { horizontal, readOnly, isTemplate } = useDinaFormContext();

  const fieldLabel = label ?? (
    <FieldHeader name={name} customName={customName} />
  );

  const [labelCol, valueCol] = isTemplate
    ? typeof horizontal === "boolean"
      ? [6, 6]
      : horizontal || [12, 12]
    : typeof horizontal === "boolean"
    ? [6, 6]
    : horizontal || [];

  return (
    <div className={`${className} ${isTemplate ? "row" : ""}`}>
      {isTemplate && (
        <input
          type="checkbox"
          style={{
            display: "block",
            height: "20px",
            marginLeft: "15px",
            width: "20px"
          }}
          className="col-sm-1 "
          name={`${name}Enabled`}
        />
      )}
      <label
        className={`${name}-field ${
          isTemplate
            ? horizontal
              ? "row col-sm-11"
              : "col-sm-10"
            : horizontal
            ? "row"
            : "w-100"
        } ${removeFormGroupClass ? "" : "form-group"}`}
      >
        {!removeLabel && (
          <div
            className={[
              `${labelCol ? `col-sm-${labelCol}` : ""}`,
              // Adjust alignment for editable inputs:
              horizontal && !readOnly ? "mt-sm-2" : "",
              "mb-2"
            ].join(" ")}
          >
            {!hideLabel && <strong>{fieldLabel}</strong>}
          </div>
        )}
        <div className={valueCol ? `col-sm-${valueCol}` : ""}>
          <FastField name={name}>
            {({ field: { value }, form }) => {
              if (readOnly || !children) {
                return (
                  readOnlyRender?.(value) ?? (
                    <ReadOnlyValue link={link} value={value} />
                  )
                );
              } else if (typeof children === "function") {
                function setValue(newValue: any) {
                  form.setFieldValue(name, newValue);
                  form.setFieldTouched(name);
                }

                return children?.({ value, setValue, formik: form });
              }
              return children;
            }}
          </FastField>
        </div>
      </label>
    </div>
  );
}
