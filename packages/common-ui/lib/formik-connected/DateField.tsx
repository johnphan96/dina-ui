import { FastField, FieldProps } from "formik";
import DatePicker from "react-datepicker";
import { FieldWrapper, LabelWrapperParams } from "./FieldWrapper";

/** Formik-connected date input. */
export function DateField(props: LabelWrapperParams) {
  const { name } = props;

  return (
    <FieldWrapper {...props}>
      <FastField name={name}>
        {({
          field: { value },
          form: { setFieldValue, setFieldTouched }
        }: FieldProps) => {
          function onChange(date: Date) {
            setFieldValue(name, date && date.toISOString().slice(0, 10));
            setFieldTouched(name);
          }

          return (
            <div>
              <DatePicker
                className="form-control"
                dateFormat="yyyy-MM-dd"
                isClearable={true}
                onChange={onChange}
                selected={value ? new Date(`${value}T12:00:00Z`) : null}
                showYearDropdown={true}
                todayButton="Today"
              />
            </div>
          );
        }}
      </FastField>
    </FieldWrapper>
  );
}
