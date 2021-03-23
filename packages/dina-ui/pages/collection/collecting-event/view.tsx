import {
  ApiClientContext,
  BackButton,
  ButtonBar,
  DinaForm,
  EditButton,
  FieldView,
  useQuery,
  withResponse
} from "common-ui";
import { FieldArray } from "formik";
import { KitsuResponse } from "kitsu";
import { orderBy } from "lodash";
import { WithRouterProps } from "next/dist/client/with-router";
import { withRouter } from "next/router";
import { Person } from "packages/dina-ui/types/agent-api/resources/Person";
import { useContext, useState } from "react";
import { Footer, GroupFieldView, Head, Nav } from "../../../components";
import { DinaMessage, useDinaIntl } from "../../../intl/dina-ui-intl";
import { CollectingEvent } from "../../../types/collection-api/resources/CollectingEvent";
import { GeoReferenceAssertionRow } from "../../../components/collection/GeoReferenceAssertionRow";
import { AttachmentReadOnlySection } from "../../../components/object-store/attachment-list/AttachmentReadOnlySection";
import Link from "next/link";
import { GeoReferenceAssertion } from "packages/dina-ui/types/collection-api/resources/GeoReferenceAssertion";

export function CollectingEventDetailsPage({ router }: WithRouterProps) {
  const { id } = router.query;
  const { formatMessage } = useDinaIntl();
  const { bulkGet } = useContext(ApiClientContext);
  const [collectingEvent, setCollectingEvent] = useState<CollectingEvent>();

  async function initOneToManyRelations(
    response: KitsuResponse<CollectingEvent, undefined>
  ) {
    if (response?.data?.collectors) {
      const agents = await bulkGet<Person>(
        response.data.collectors.map(collector => `/person/${collector.id}`),
        { apiBaseUrl: "/agent-api", returnNullForMissingResource: true }
      );
      // Omit null (deleted) records:
      response.data.collectors = agents.filter(it => it);
    }

    if (response?.data?.geoReferenceAssertions) {
      // Retrieve georeferenceAssertion with georeferencedBy
      const geoReferenceAssertions = await bulkGet<GeoReferenceAssertion>(
        response?.data?.geoReferenceAssertions.map(
          it => `/georeference-assertion/${it.id}?include=georeferencedBy`
        ),
        { apiBaseUrl: "/collection-api", returnNullForMissingResource: true }
      );

      // Retrieve georeferencedBy associated agents
      let agentBulkGetArgs: string[];
      agentBulkGetArgs = [];
      geoReferenceAssertions.forEach(async assert => {
        if (assert.georeferencedBy) {
          agentBulkGetArgs = agentBulkGetArgs.concat(
            assert.georeferencedBy.map(it => `/person/${it.id}`)
          );
        }
      });

      const agents = await bulkGet<Person>(agentBulkGetArgs, {
        apiBaseUrl: "/agent-api",
        returnNullForMissingResource: true
      });

      geoReferenceAssertions.forEach(assert => {
        const refers = assert.georeferencedBy;
        refers?.map(refer => {
          const index = assert.georeferencedBy?.findIndex(
            it => it.id === refer.id
          );
          const agent = agents.filter(it => it.id === refer.id)?.[0];
          if (assert.georeferencedBy !== undefined && index !== undefined) {
            assert.georeferencedBy[index] = agent;
          }
        });
      });
      response.data.geoReferenceAssertions = geoReferenceAssertions;
    }

    // Order GeoReferenceAssertions by "createdOn" ascending:
    if (response?.data) {
      response.data.geoReferenceAssertions = orderBy(
        response.data.geoReferenceAssertions,
        "createdOn"
      );
    }

    setCollectingEvent(response.data);
  }

  const collectingEventQuery = useQuery<CollectingEvent>(
    {
      path: `collection-api/collecting-event/${id}`,
      include: "attachment,collectors,geoReferenceAssertions"
    },
    { onSuccess: initOneToManyRelations }
  );

  return (
    <div>
      <Head title={formatMessage("collectingEventViewTitle")} />
      <Nav />
      <ButtonBar>
        <EditButton
          entityId={id as string}
          entityLink="collection/collecting-event"
        />
        <Link href={`/collection/collecting-event/revisions?id=${id}`}>
          <a className="btn btn-info">
            <DinaMessage id="revisionsButtonText" />
          </a>
        </Link>
        <BackButton
          entityId={id as string}
          entityLink="/collection/collecting-event"
          byPassView={true}
        />
      </ButtonBar>
      {withResponse(collectingEventQuery, ({ data: colEvent }) => {
        if (colEvent.createdOn) {
          const inUserTimeZone = new Date(colEvent.createdOn).toString();
          if (collectingEvent) collectingEvent.createdOn = inUserTimeZone;
        }

        return (
          <main className="container-fluid">
            <h1>
              <DinaMessage id="collectingEventViewTitle" />
            </h1>
            <div>
              {collectingEvent && (
                <DinaForm<CollectingEvent> initialValues={collectingEvent}>
                  <div>
                    <div className="form-group">
                      <div className="row">
                        <GroupFieldView
                          className="col-md-2"
                          name="group"
                          label={formatMessage("field_group")}
                        />
                      </div>
                      <div className="row">
                        <div className="col-md-6">
                          <fieldset className="form-group border px-4 py-2">
                            <legend className="w-auto">
                              <DinaMessage id="collectingDateLegend" />
                            </legend>
                            <FieldView
                              name="startEventDateTime"
                              label={formatMessage("startEventDateTimeLabel")}
                            />
                            {collectingEvent.endEventDateTime && (
                              <FieldView
                                name="endEventDateTime"
                                label={formatMessage("endEventDateTimeLabel")}
                              />
                            )}
                            <FieldView
                              name="verbatimEventDateTime"
                              label={formatMessage(
                                "verbatimEventDateTimeLabel"
                              )}
                            />
                          </fieldset>
                          <fieldset className="form-group border px-4 py-2">
                            <legend className="w-auto">
                              <DinaMessage id="collectingAgentsLegend" />
                            </legend>
                            <FieldView name="dwcRecordedBy" />
                            <FieldView name="collectors" />
                            <FieldView name="dwcRecordNumber" />
                            <FieldView name="dwcOtherRecordNumbers" />
                          </fieldset>
                          <fieldset className="form-group border px-4 py-2">
                            <legend className="w-auto">
                              <DinaMessage id="toponymyLegend" />
                            </legend>
                            <FieldView name="dwcMunicipality" />
                            <FieldView name="dwcStateProvince" />
                            <FieldView name="dwcCountry" />
                          </fieldset>
                        </div>
                        <div className="col-md-6">
                          <fieldset className="form-group border px-4 py-2">
                            <legend className="w-auto">
                              <DinaMessage id="verbatimCoordinatesLegend" />
                            </legend>
                            <FieldView name="dwcVerbatimLocality" />
                            <FieldView name="dwcVerbatimLatitude" />
                            <FieldView name="dwcVerbatimLongitude" />
                            <FieldView name="dwcVerbatimCoordinates" />
                            <FieldView name="dwcVerbatimCoordinateSystem" />
                            <FieldView name="dwcVerbatimSRS" />
                            <FieldView name="dwcVerbatimElevation" />
                            <FieldView name="dwcVerbatimDepth" />
                          </fieldset>
                          <fieldset className="form-group border px-4 py-2">
                            <legend className="w-auto">
                              <DinaMessage id="geoReferencingLegend" />
                            </legend>
                            {collectingEvent?.geoReferenceAssertions?.length ? (
                              <ul className="list-group">
                                <FieldArray name="geoReferenceAssertions">
                                  {() =>
                                    collectingEvent?.geoReferenceAssertions?.map(
                                      (assertion, index) => (
                                        <li
                                          className="list-group-item"
                                          key={assertion.id}
                                        >
                                          <GeoReferenceAssertionRow
                                            index={index}
                                            viewOnly={true}
                                          />
                                        </li>
                                      )
                                    )
                                  }
                                </FieldArray>
                              </ul>
                            ) : null}
                          </fieldset>
                        </div>
                      </div>
                    </div>
                  </div>
                </DinaForm>
              )}
              <div className="form-group">
                <AttachmentReadOnlySection
                  attachmentPath={`collection-api/collecting-event/${id}/attachment`}
                  detachTotalSelected={true}
                />
              </div>
            </div>
          </main>
        );
      })}
      <Footer />
    </div>
  );
}

export default withRouter(CollectingEventDetailsPage);
