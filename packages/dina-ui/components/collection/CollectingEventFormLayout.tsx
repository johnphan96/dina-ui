import {
  AutoSuggestTextField,
  DinaFormSection,
  FieldSet,
  filterBy,
  FormattedTextField,
  FormikButton,
  NominatumApiSearchResult,
  ResourceSelectField,
  TextField,
  useDinaFormContext,
  TextFieldWithCoordButtons,
  TextFieldWithRemoveButton,
  LoadingSpinner
} from "common-ui";
import { FastField, Field, FieldArray, FormikContextType } from "formik";
import { clamp } from "lodash";
import { SRS } from "../../types/collection-api/resources/SRS";
import { useState, useRef } from "react";
import { ShouldRenderReasons } from "react-autosuggest";
import Switch from "react-switch";
import { Tab, TabList, TabPanel, Tabs } from "react-tabs";
import {
  GeographySearchBox,
  GeoReferenceAssertionRow,
  GroupSelectField,
  nominatimAddressDetailSearch,
  useAddPersonModal,
  NominatumApiAddressDetailSearchResult,
  NominatimAddressDetailSearchProps
} from "..";
import { DinaMessage, useDinaIntl } from "../../intl/dina-ui-intl";
import { Person } from "../../types/agent-api/resources/Person";
import {
  geographicPlaceSourceUrl,
  SourceAdministrativeLevel
} from "../../types/collection-api/resources/GeographicPlaceNameSourceDetail";
import {
  CollectingEvent,
  GeographicPlaceNameSource
} from "../../types/collection-api/resources/CollectingEvent";
import {
  CoordinateSystem,
  CoordinateSystemEnum,
  CoordinateSystemEnumPlaceHolder
} from "../../types/collection-api/resources/CoordinateSystem";
import { AttachmentReadOnlySection } from "../object-store/attachment-list/AttachmentReadOnlySection";
import { ManagedAttributesEditor } from "../object-store/managed-attributes/ManagedAttributesEditor";
import { ManagedAttributesViewer } from "../object-store/managed-attributes/ManagedAttributesViewer";
import { SetCoordinatesFromVerbatimButton } from "./SetCoordinatesFromVerbatimButton";
import useSWR from "swr";

interface CollectingEventFormLayoutProps {
  setDefaultVerbatimCoordSys?: (newValue: string | undefined | null) => void;
  setDefaultVerbatimSRS?: (newValue: string | undefined | null) => void;
}

/** Layout of fields which is re-useable between the edit page and the read-only view. */
export function CollectingEventFormLayout({
  setDefaultVerbatimCoordSys,
  setDefaultVerbatimSRS
}: CollectingEventFormLayoutProps) {
  const { formatMessage } = useDinaIntl();
  const { openAddPersonModal } = useAddPersonModal();
  const [rangeEnabled, setRangeEnabled] = useState(false);

  const { initialValues, readOnly } = useDinaFormContext();

  // Open the tab with the Primary geoassertion even if it's not the first one.
  // Defaults to 0 if there's no primary assertion.
  const intialPrimaryAssertionIndex = clamp(
    (initialValues as Partial<CollectingEvent>).geoReferenceAssertions?.findIndex(
      assertion => assertion?.isPrimary
    ) ?? 0,
    0,
    Infinity
  );

  const [activeTabIdx, setActiveTabIdx] = useState(intialPrimaryAssertionIndex);

  const [geoSearchValue, setGeoSearchValue] = useState<string>("");

  const [customPlaceValue, setCustomPlaceValue] = useState<string>("");
  const [hideCustomPlace, setHideCustomPlace] = useState(true);
  const [hideRemoveBtn, setHideRemoveBtn] = useState(true);
  const [selectedSearchResult, setSelectedSearchResult] = useState<{}>();

  const { isValidating: detailResultsIsLoading } = useSWR(
    [selectedSearchResult, "nominatimAddressDetailSearch"],
    nominatimAddressDetailSearch,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false
    }
  );

  const commonSrcDetailRoot = "geographicPlaceNameSourceDetail";

  function toggleRangeEnabled(
    newValue: boolean,
    formik: FormikContextType<{}>
  ) {
    if (!newValue) {
      formik.setFieldValue("endEventDateTime", null);
    }
    setRangeEnabled(newValue);
  }

  async function selectSearchResult(
    result: NominatumApiSearchResult,
    formik: FormikContextType<{}>
  ) {
    const osmTypeForSearch =
      result?.osm_type === "relation"
        ? "R"
        : result?.osm_type === "way"
        ? "W"
        : result?.osm_type === "node"
        ? "N"
        : "N";

    formik.setFieldValue(
      `${commonSrcDetailRoot}.country.name`,
      result?.address?.country || null
    );
    formik.setFieldValue(
      `${commonSrcDetailRoot}.stateProvince.name`,
      result?.address?.state || null
    );
    formik.setFieldValue(
      `${commonSrcDetailRoot}.stateProvince.id`,
      result?.osm_id || null
    );
    formik.setFieldValue(
      `${commonSrcDetailRoot}.stateProvince.element`,
      result?.osm_type || null
    );

    formik.setFieldValue(
      `${commonSrcDetailRoot}.sourceUrl`,
      `${geographicPlaceSourceUrl}osmtype=${osmTypeForSearch}&osmid=${result.osm_id}`
    );
    formik.setFieldValue(
      `${commonSrcDetailRoot}.geographicPlaceNameSource`,
      GeographicPlaceNameSource.OSM
    );

    // get the address detail with another nomiature call

    const detailSearchProps: NominatimAddressDetailSearchProps = {
      urlValue: {
        osmid: result.osm_id,
        osmtype: osmTypeForSearch,
        class: result.category
      },
      updateAdminLevels,
      formik
    };

    setSelectedSearchResult(detailSearchProps);
  }

  function updateAdminLevels(detailResults, formik) {
    const geoNameParsed = parseGeoAdminLevels(detailResults as any, formik);
    formik.setFieldValue("srcAdminLevels", geoNameParsed);
    setHideCustomPlace(false);
    setHideRemoveBtn(false);
  }

  function parseGeoAdminLevels(
    detailResults: NominatumApiAddressDetailSearchResult | null,
    formik
  ) {
    const editableSrcAdmnLevels: SourceAdministrativeLevel[] = [];
    let detail: SourceAdministrativeLevel = {};
    detailResults?.address?.map(addr => {
      // omitting country and state
      if (
        addr.type !== "country" &&
        addr.type !== "state" &&
        addr.type !== "country_code" &&
        addr.place_type !== "province" &&
        addr.place_type !== "state" &&
        addr.place_type !== "country" &&
        addr.isaddress &&
        (addr.osm_id || addr.place_id)
      ) {
        detail.id = addr.osm_id;
        detail.element = addr.osm_type;
        detail.placeType = addr.place_type ?? addr.class;
        detail.name = detail.placeType
          ? addr.localname + " [ " + detail.placeType + " ] "
          : addr.localname;
        editableSrcAdmnLevels.push(detail);
      }
      // fill in the country code
      if (addr.type === "country_code")
        formik.setFieldValue(
          `${commonSrcDetailRoot}.country.code`,
          addr.localname
        );

      // fill in the state/province name if it is not yet filled up
      if (
        (addr.place_type === "province" || addr.place_type === "state") &&
        !formik.values[`${commonSrcDetailRoot}.stateProvince.name`]
      )
        formik.setFieldValue(
          `${commonSrcDetailRoot}.stateProvince.name`,
          addr.localname
        );

      detail = {};
    });
    return editableSrcAdmnLevels;
  }

  function removeThisPlace(formik: FormikContextType<{}>) {
    // reset the source fields when user remove the place
    formik.setFieldValue(commonSrcDetailRoot, null);
    formik.setFieldValue("geographicPlaceNameSource", null);

    formik.setFieldValue("srcAdminLevels", null);
    setCustomPlaceValue("");
    setHideCustomPlace(true);
    setHideRemoveBtn(true);
  }

  /** Does a Places search using the given search string. */
  function doGeoSearch(query: string) {
    setGeoSearchValue(query);
    // Do the geo-search automatically:
    setImmediate(() =>
      document?.querySelector<HTMLElement>(".geo-search-button")?.click()
    );
  }

  /* Ensure config is rendered when input get focuse without needing to enter any value */
  function shouldRenderSuggestions(value: string, reason: ShouldRenderReasons) {
    return (
      value?.length >= 0 ||
      reason === "input-changed" ||
      reason === "input-focused"
    );
  }

  function onSuggestionSelected(_, formik) {
    /* To bring the effect as if the field's value is changed to reflect the placeholder change */
    formik.values.dwcVerbatimLatitude === null
      ? formik.setFieldValue("dwcVerbatimLatitude", "")
      : formik.setFieldValue("dwcVerbatimLatitude", null);
    formik.values.dwcVerbatimLongitude === null
      ? formik.setFieldValue("dwcVerbatimLongitude", "")
      : formik.setFieldValue("dwcVerbatimLongitude", null);
    formik.values.dwcVerbatimCoordinates === null
      ? formik.setFieldValue("dwcVerbatimCoordinates", "")
      : formik.setFieldValue("dwcVerbatimCoordinates", null);
  }

  const onChangeExternal = (form, name, value) => {
    if (name === "dwcVerbatimCoordinateSystem") {
      setDefaultVerbatimCoordSys?.(value);
      /*When user enter other values instead of selecting from existing config,
      correctly setting the placeHolder for verbatim coordinates */
      if (
        value !== CoordinateSystemEnum.DECIMAL_DEGREE &&
        value !== CoordinateSystemEnum.DEGREE_DECIMAL_MINUTES &&
        value !== CoordinateSystemEnum.DEGREE_MINUTES_SECONDS &&
        value !== CoordinateSystemEnum.UTM
      ) {
        form.values.dwcVerbatimCoordinates === null
          ? form.setFieldValue("dwcVerbatimCoordinates", "")
          : form.setFieldValue("dwcVerbatimCoordinates", null);
      }
    } else if (name === "dwcVerbatimSRS") {
      setDefaultVerbatimSRS?.(value);
    }
  };

  const addCustomPlaceName = form => {
    if (!customPlaceValue || customPlaceValue.length === 0) return;
    // Add user entered custom place in front
    const customPlaceAsInSrcAdmnLevel: SourceAdministrativeLevel = {};
    customPlaceAsInSrcAdmnLevel.name = customPlaceValue;
    const srcAdminLevels = form.values.srcAdminLevels;
    srcAdminLevels.unshift(customPlaceAsInSrcAdmnLevel);
    form.setFieldValue("srcAdminLevels", srcAdminLevels);
    setHideCustomPlace(true);
  };

  return (
    <div>
      <DinaFormSection horizontal={[3, 9]}>
        <div className="row">
          <div className="col-md-6">
            <GroupSelectField name="group" enableStoredDefaultGroup={true} />
          </div>
          <div className="col-md-6">
            <TextField name="dwcOtherRecordNumbers" multiLines={true} />
          </div>
        </div>
      </DinaFormSection>
      <div className="row">
        <div className="col-md-6">
          <FieldSet legend={<DinaMessage id="collectingDateLegend" />}>
            <FormattedTextField
              name="startEventDateTime"
              className="startEventDateTime"
              label={formatMessage("startEventDateTimeLabel")}
              placeholder={"YYYY-MM-DDTHH:MM:SS.MMM"}
            />
            <Field name="endEventDateTime">
              {({ field: { value: endEventDateTime }, form }) => (
                <div>
                  {(rangeEnabled || endEventDateTime) && (
                    <FormattedTextField
                      name="endEventDateTime"
                      label={formatMessage("endEventDateTimeLabel")}
                      placeholder={"YYYY-MM-DDTHH:MM:SS.MMM"}
                    />
                  )}
                  {!readOnly && (
                    <label style={{ marginLeft: 15, marginTop: -15 }}>
                      <span>{formatMessage("enableDateRangeLabel")}</span>
                      <Switch
                        onChange={newValue =>
                          toggleRangeEnabled(newValue, form)
                        }
                        checked={rangeEnabled || !!endEventDateTime || false}
                        className="react-switch dateRange"
                      />
                    </label>
                  )}
                </div>
              )}
            </Field>
            <TextField
              name="verbatimEventDateTime"
              label={formatMessage("verbatimEventDateTimeLabel")}
            />
          </FieldSet>
        </div>
        <div className="col-md-6">
          <FieldSet legend={<DinaMessage id="collectingAgentsLegend" />}>
            <AutoSuggestTextField<CollectingEvent>
              name="dwcRecordedBy"
              query={(searchValue, ctx) => ({
                path: "collection-api/collecting-event",
                filter: {
                  ...(ctx.values.group && { group: { EQ: ctx.values.group } }),
                  rsql: `dwcRecordedBy==*${searchValue}*`
                }
              })}
              suggestion={collEvent => collEvent.dwcRecordedBy ?? ""}
            />
            <ResourceSelectField<Person>
              name="collectors"
              arrayItemLink="/person/view?id="
              filter={filterBy(["displayName"])}
              model="agent-api/person"
              optionLabel={person => person.displayName}
              isMulti={true}
              asyncOptions={[
                {
                  label: <DinaMessage id="addNewPerson" />,
                  getResource: openAddPersonModal
                }
              ]}
            />
            <TextField name="dwcRecordNumber" />
          </FieldSet>
        </div>
      </div>
      <FieldSet legend={<DinaMessage id="collectingLocationLegend" />}>
        <FieldSet legend={<DinaMessage id="verbatimLabelLegend" />}>
          <div className="row">
            <div className="col-md-6">
              <TextField name="dwcVerbatimLocality" />
              <AutoSuggestTextField<CoordinateSystem>
                name="dwcVerbatimCoordinateSystem"
                configQuery={() => ({
                  path: "collection-api/coordinate-system"
                })}
                configSuggestion={src => src?.coordinateSystem ?? []}
                shouldRenderSuggestions={shouldRenderSuggestions}
                onSuggestionSelected={onSuggestionSelected}
                onChangeExternal={onChangeExternal}
              />
              <Field name="dwcVerbatimCoordinateSystem">
                {({ field: { value: coordSysSelected } }) => {
                  /* note need to consider there is also possible user enter their own verbatime coordsys
                    and not select any one from the dropdown*/
                  const hasDegree =
                    coordSysSelected === CoordinateSystemEnum.DECIMAL_DEGREE;

                  const hasMinute =
                    coordSysSelected ===
                    CoordinateSystemEnum.DEGREE_DECIMAL_MINUTES;

                  const hasSecond =
                    coordSysSelected ===
                    CoordinateSystemEnum.DEGREE_MINUTES_SECONDS;

                  const isUTM = coordSysSelected === CoordinateSystemEnum.UTM;

                  return (
                    <>
                      <TextField
                        name="dwcVerbatimCoordinates"
                        placeholder={
                          isUTM
                            ? CoordinateSystemEnumPlaceHolder[coordSysSelected]
                            : null
                        }
                        className={
                          !hasDegree && !hasMinute && !hasSecond ? "" : "d-none"
                        }
                      />
                      <TextFieldWithCoordButtons
                        name="dwcVerbatimLatitude"
                        placeholder={
                          hasDegree || hasMinute || hasSecond
                            ? `${CoordinateSystemEnumPlaceHolder[coordSysSelected]}N`
                            : undefined
                        }
                        isExternallyControlled={true}
                        shouldShowDegree={hasDegree || hasMinute || hasSecond}
                        shouldShowMinute={hasMinute || hasSecond}
                        shouldShowSecond={hasSecond}
                        className={
                          hasDegree || hasMinute || hasSecond ? "" : "d-none"
                        }
                      />
                      <TextFieldWithCoordButtons
                        name="dwcVerbatimLongitude"
                        placeholder={
                          hasDegree || hasMinute || hasSecond
                            ? `${CoordinateSystemEnumPlaceHolder[coordSysSelected]}E`
                            : undefined
                        }
                        isExternallyControlled={true}
                        shouldShowDegree={hasDegree || hasMinute || hasSecond}
                        shouldShowMinute={hasMinute || hasSecond}
                        shouldShowSecond={hasSecond}
                        className={
                          hasDegree || hasMinute || hasSecond ? "" : "d-none"
                        }
                      />
                      <div
                        className={
                          hasDegree || hasMinute || hasSecond
                            ? "form-group"
                            : "d-none"
                        }
                      >
                        <SetCoordinatesFromVerbatimButton
                          sourceLatField="dwcVerbatimLatitude"
                          sourceLonField="dwcVerbatimLongitude"
                          targetLatField={`geoReferenceAssertions[${activeTabIdx}].dwcDecimalLatitude`}
                          targetLonField={`geoReferenceAssertions[${activeTabIdx}].dwcDecimalLongitude`}
                          onClick={({ lat, lon }) =>
                            setGeoSearchValue(`${lat}, ${lon}`)
                          }
                        >
                          <DinaMessage id="latLongAutoSetterButton" />
                        </SetCoordinatesFromVerbatimButton>
                      </div>
                    </>
                  );
                }}
              </Field>
            </div>
            <div className="col-md-6">
              <AutoSuggestTextField<SRS>
                name="dwcVerbatimSRS"
                configQuery={() => ({
                  path: "collection-api/srs"
                })}
                configSuggestion={src => src?.srs ?? []}
                shouldRenderSuggestions={shouldRenderSuggestions}
                onChangeExternal={onChangeExternal}
              />
              <TextField name="dwcVerbatimElevation" />
              <TextField name="dwcVerbatimDepth" />
            </div>
          </div>
        </FieldSet>
        <div className="row">
          <div className="col-lg-6">
            <FieldSet legend={<DinaMessage id="geoReferencingLegend" />}>
              <FieldArray name="geoReferenceAssertions">
                {({ form, push, remove }) => {
                  const assertions =
                    (form.values as CollectingEvent).geoReferenceAssertions ??
                    [];

                  function addGeoReference() {
                    push({ isPrimary: assertions.length === 0 });
                    setActiveTabIdx(assertions.length);
                  }

                  function removeGeoReference(index: number) {
                    remove(index);
                    // Stay on the current tab number, or reduce if removeing the last element:
                    setActiveTabIdx(current =>
                      clamp(current, 0, assertions.length - 2)
                    );
                  }
                  return (
                    <div className="georeference-assertion-section">
                      <Tabs
                        selectedIndex={activeTabIdx}
                        onSelect={setActiveTabIdx}
                      >
                        {
                          // Only show the tabs when there is more than 1 assertion:
                          <TabList
                            className={`react-tabs__tab-list ${
                              assertions.length === 1 ? "d-none" : ""
                            }`}
                          >
                            {assertions.map((assertion, index) => (
                              <Tab key={index}>
                                <span className="m-3">
                                  {index + 1}
                                  {assertion.isPrimary &&
                                    ` (${formatMessage("primary")})`}
                                </span>
                              </Tab>
                            ))}
                          </TabList>
                        }
                        {assertions.length
                          ? assertions.map((assertion, index) => (
                              <TabPanel key={index}>
                                <GeoReferenceAssertionRow
                                  index={index}
                                  openAddPersonModal={openAddPersonModal}
                                  assertion={assertion}
                                  viewOnly={readOnly}
                                />
                                {!readOnly && (
                                  <div className="list-inline mb-3">
                                    <FormikButton
                                      className="list-inline-item btn btn-primary add-assertion-button"
                                      onClick={addGeoReference}
                                    >
                                      <DinaMessage id="addAnotherAssertion" />
                                    </FormikButton>
                                    <FormikButton
                                      className="list-inline-item btn btn-dark"
                                      onClick={() => removeGeoReference(index)}
                                    >
                                      <DinaMessage id="removeAssertionLabel" />
                                    </FormikButton>
                                  </div>
                                )}
                              </TabPanel>
                            ))
                          : null}
                      </Tabs>
                      {!assertions.length && !readOnly && (
                        <FormikButton
                          className="btn btn-primary add-assertion-button"
                          onClick={addGeoReference}
                        >
                          <DinaMessage id="addAssertion" />
                        </FormikButton>
                      )}
                    </div>
                  );
                }}
              </FieldArray>
            </FieldSet>
          </div>
          <div className="col-lg-6">
            <FieldSet legend={<DinaMessage id="toponymyLegend" />}>
              <div
                style={{
                  overflowY: "auto",
                  overflowX: "hidden",
                  maxHeight: 520
                }}
              >
                <Field name="geographicPlaceNameSourceDetail">
                  {({ field: { value: detail }, form }) =>
                    detail ? (
                      <div>
                        {!hideCustomPlace && !readOnly && (
                          <div className="m-3">
                            <div className="d-flex flex-row">
                              <label
                                className="p-2"
                                style={{ marginLeft: -20 }}
                              >
                                <strong>
                                  <DinaMessage id="customPlaceName" />
                                </strong>
                              </label>
                              <input
                                className="p-2 form-control"
                                style={{ width: "60%" }}
                                onChange={e =>
                                  setCustomPlaceValue(e.target.value)
                                }
                                onKeyDown={e => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    if (customPlaceValue?.length > 0) {
                                      addCustomPlaceName(form);
                                    }
                                  }
                                }}
                              />
                              <button
                                className="mb-2 btn btn-primary"
                                type="button"
                                onClick={() => addCustomPlaceName(form)}
                              >
                                <DinaMessage id="addCustomPlaceName" />
                              </button>
                            </div>
                          </div>
                        )}
                        {detailResultsIsLoading ? (
                          <LoadingSpinner loading={true} />
                        ) : (
                          form.values.srcAdminLevels?.length > 0 && (
                            <FieldArray name="srcAdminLevels">
                              {({ remove }) => {
                                const geoNames = form.values.srcAdminLevels;
                                function removeItem(index: number) {
                                  remove(index);
                                }
                                return (
                                  <div className="pb-4">
                                    {geoNames.map((_, idx) => (
                                      <TextFieldWithRemoveButton
                                        name={`srcAdminLevels[${idx}].name`}
                                        readOnly={true}
                                        removeLabel={true}
                                        removeFormGroupClass={true}
                                        removeItem={removeItem}
                                        key={Math.random()}
                                        index={idx}
                                        hideCloseBtn={hideRemoveBtn}
                                        inputProps={{
                                          style: {
                                            backgroundColor: `${
                                              idx % 2 === 0
                                                ? "#e9ecef"
                                                : "white"
                                            }`
                                          }
                                        }}
                                      />
                                    ))}
                                  </div>
                                );
                              }}
                            </FieldArray>
                          )
                        )}
                        <DinaFormSection horizontal={[3, 9]}>
                          <TextField
                            name={`${commonSrcDetailRoot}.stateProvince.name`}
                            label={formatMessage("stateProvinceLabel")}
                            readOnly={true}
                          />
                          <TextField
                            name={`${commonSrcDetailRoot}.country.name`}
                            label={formatMessage("countryLabel")}
                            readOnly={true}
                          />
                        </DinaFormSection>
                        <div className="row">
                          {!readOnly && (
                            <div className="col-md-4">
                              <FormikButton
                                className="btn btn-dark"
                                onClick={(_, formik) => removeThisPlace(formik)}
                              >
                                <DinaMessage id="removeThisPlaceLabel" />
                              </FormikButton>
                            </div>
                          )}
                          <div className="col-md-4">
                            {detail.sourceUrl && (
                              <a
                                href={`${detail.sourceUrl}`}
                                target="_blank"
                                className="btn btn-info"
                              >
                                <DinaMessage id="viewDetailButtonLabel" />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : !readOnly ? (
                      <GeographySearchBox
                        inputValue={geoSearchValue}
                        onInputChange={setGeoSearchValue}
                        onSelectSearchResult={selectSearchResult}
                        renderUnderSearchBar={
                          <Field>
                            {({ form: { values: formState } }) => {
                              const colEvent: Partial<CollectingEvent> = formState;
                              const activeAssertion =
                                colEvent.geoReferenceAssertions?.[activeTabIdx];

                              const decimalLat =
                                activeAssertion?.dwcDecimalLatitude;
                              const decimalLon =
                                activeAssertion?.dwcDecimalLongitude;

                              const hasVerbatimLocality = !!colEvent.dwcVerbatimLocality;
                              const hasDecimalCoords = !!(
                                decimalLat && decimalLon
                              );

                              const hasAnyLocation =
                                hasVerbatimLocality || hasDecimalCoords;

                              return hasAnyLocation ? (
                                <div className="form-group d-flex flex-row align-items-center">
                                  <div className="pr-3">
                                    <DinaMessage id="search" />:
                                  </div>
                                  <FormikButton
                                    className={
                                      hasVerbatimLocality
                                        ? "btn btn-link"
                                        : "d-none"
                                    }
                                    onClick={state =>
                                      doGeoSearch(state.dwcVerbatimLocality)
                                    }
                                  >
                                    <DinaMessage id="field_dwcVerbatimLocality" />
                                  </FormikButton>
                                  <FormikButton
                                    className={
                                      hasDecimalCoords
                                        ? "btn btn-link"
                                        : "d-none"
                                    }
                                    onClick={state => {
                                      const assertion =
                                        state.geoReferenceAssertions?.[
                                          activeTabIdx
                                        ];
                                      const lat = assertion?.dwcDecimalLatitude;
                                      const lon =
                                        assertion?.dwcDecimalLongitude;
                                      doGeoSearch(`${lat}, ${lon}`);
                                    }}
                                  >
                                    <DinaMessage id="decimalLatLong" />
                                  </FormikButton>
                                </div>
                              ) : null;
                            }}
                          </Field>
                        }
                      />
                    ) : null
                  }
                </Field>
              </div>
            </FieldSet>
          </div>
        </div>
      </FieldSet>
      <div className="row">
        <div className="col-md-6">
          <FieldSet legend={<DinaMessage id="managedAttributeListTitle" />}>
            {readOnly ? (
              <FastField name="managedAttributeValues">
                {({ field: { value } }) => (
                  <ManagedAttributesViewer
                    values={value}
                    managedAttributeApiPath={key =>
                      `collection-api/managed-attribute/collecting_event.${key}`
                    }
                  />
                )}
              </FastField>
            ) : (
              <ManagedAttributesEditor
                valuesPath="managedAttributeValues"
                valueFieldName="assignedValue"
                managedAttributeApiPath="collection-api/managed-attribute"
                apiBaseUrl="/collection-api"
                managedAttributeComponent="COLLECTING_EVENT"
                managedAttributeKeyField="key"
              />
            )}
          </FieldSet>
        </div>
      </div>
      {readOnly && (
        <div className="form-group">
          <Field name="id">
            {({ field: { value: id } }) => (
              <AttachmentReadOnlySection
                attachmentPath={`collection-api/collecting-event/${id}/attachment`}
                detachTotalSelected={true}
              />
            )}
          </Field>
        </div>
      )}
    </div>
  );
}
