import { ResourceIdentifierObject } from "jsonapi-typescript";
import { KitsuResource } from "kitsu";
import {
  GeographicPlaceNameSourceDetail,
  SourceAdministrativeLevel
} from "./GeographicPlaceNameSourceDetail";
import { CollectorGroup } from "./CollectorGroup";
import { GeoReferenceAssertion } from "./GeoReferenceAssertion";

export interface CollectingEventAttributes {
  uuid: string;

  startEventDateTime: string;
  endEventDateTime?: string;
  dwcRecordedBy?: string;
  verbatimEventDateTime?: string;

  dwcVerbatimLocality?: string;
  dwcVerbatimLatitude?: string;
  dwcVerbatimLongitude?: string;
  dwcVerbatimCoordinates?: string;
  dwcVerbatimCoordinateSystem?: string;
  dwcVerbatimSRS?: string;
  dwcVerbatimElevation?: string;
  dwcVerbatimDepth?: string;
  dwcOtherRecordNumbers?: string[];
  dwcRecordNumber?: string;

  dwcCountry?: string;
  dwcCountryCode?: string;
  dwcStateProvince?: string;
  dwcMunicipality?: string;

  createdBy?: string;
  createdOn?: string;
  collectorGroupUuid?: string;

  group: string;
  geographicPlaceNameSourceDetail?: GeographicPlaceNameSourceDetail;
  geographicPlaceNameSource?: GeographicPlaceNameSource;
  srcAdminLevels?: SourceAdministrativeLevel[];
}

export enum GeographicPlaceNameSource {
  OSM = "OSM"
}

export interface CollectingEventRelationships {
  attachment?: ResourceIdentifierObject[];
  collectors?: KitsuResource[];
  collectorGroups?: CollectorGroup[];
  geoReferenceAssertions?: GeoReferenceAssertion[];
}

export type CollectingEvent = KitsuResource &
  CollectingEventAttributes &
  CollectingEventRelationships;
