import CoordinateParser from "coordinate-parser";
import { useState } from "react";
import useSWR from "swr";
import { LoadingSpinner, NominatumApiSearchResult } from "common-ui";
import { DinaMessage } from "../../intl/dina-ui-intl";

interface GeographySearchBoxProps {
  inputValue: string;
  onInputChange: (value: string) => void;

  onSelectSearchResult: (result: NominatumApiSearchResult) => void;
}

async function nominatimSearch(
  searchValue: string
): Promise<NominatumApiSearchResult[] | null> {
  if (!searchValue?.trim()) {
    return null;
  }

  // If search string is in {lat, lon} format then do a reverse geo lookup:
  let coords: CoordinateParser | null;
  try {
    coords = new CoordinateParser(searchValue);
  } catch {
    coords = null;
  }

  const url = new URL(
    `https://nominatim.openstreetmap.org/${coords ? "reverse" : "search"}.php`
  );
  url.search = new URLSearchParams({
    ...(coords
      ? {
          lat: String(coords.getLatitude()),
          lon: String(coords.getLongitude())
        }
      : { q: searchValue }),
    addressdetails: "1",
    format: "jsonv2"
  }).toString();

  const fetchJson = urlArg => window.fetch(urlArg).then(res => res.json());

  try {
    const response = await fetchJson(url.toString());
    // Search API returns an array ; Reverse API returns a single place:
    return (coords ? [response] : response) as NominatumApiSearchResult[];
  } catch (error) {
    console.error(error);
    return [];
  }
}

export function GeographySearchBox({
  onSelectSearchResult,
  inputValue,
  onInputChange
}: GeographySearchBoxProps) {
  /** The query passed to the nominatum API. This state is only set when the user submits the search input. */
  const [searchValue, setSearchValue] = useState<string>("");

  /** Whether the Geo Api is on hold. Just to make sure we don't send more requests than we are allowed to. */
  const [geoApiRequestsOnHold, setGeoApiRequestsOnHold] = useState(false);

  const { isValidating: geoSearchIsLoading, data: searchResults } = useSWR(
    [searchValue, "nominatum-search"],
    nominatimSearch,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false
    }
  );

  const suggestButtonIsDisabled =
    geoApiRequestsOnHold || !inputValue || geoSearchIsLoading;

  function selectGeoResult(result: NominatumApiSearchResult) {
    onInputChange("");
    setSearchValue("");
    onSelectSearchResult?.(result);
  }

  function doSearch() {
    // Set a 1-second API request throttle:
    if (suggestButtonIsDisabled) {
      return;
    }
    setGeoApiRequestsOnHold(true);
    setTimeout(() => setGeoApiRequestsOnHold(false), 1000);

    // Set the new search value which will make useSWR do the lookup:
    setSearchValue(inputValue);
  }

  return (
    <div>
      <div className="row">
        <div className="col-md-1">
          <label>
            <strong>
              <DinaMessage id="locationLabel" />
            </strong>
          </label>
        </div>
        <div className="col-md-8">
          <input
            className="form-control"
            onChange={e => onInputChange(e.target.value)}
            onFocus={e => e.target.select()}
            onKeyDown={e => {
              if (e.keyCode === 13) {
                e.preventDefault();
                doSearch();
              }
            }}
            value={inputValue}
          />
        </div>
        <div className="col-md-1">
          <button
            onClick={doSearch}
            className="btn btn-primary"
            type="button"
            disabled={suggestButtonIsDisabled}
          >
            <DinaMessage id="searchButton" />
          </button>
        </div>
      </div>
      <div>
        <br />
        {geoSearchIsLoading ? (
          <LoadingSpinner loading={true} />
        ) : searchResults?.length === 0 ? (
          <DinaMessage id="noResultsFound" />
        ) : (
          searchResults?.map((place, index) => (
            <div key={place.osm_id}>
              <style>{`
                .searchResult {
                  font-size:12pt; font-family:verdana,sans-serif;
                }     
            `}</style>
              <div className="row">
                <div className="col-md-12 searchResult">
                  {place.display_name}
                </div>
              </div>
              <div className="row">
                <div className="col-md-4">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => selectGeoResult(place)}
                  >
                    <DinaMessage id="select" />
                  </button>
                </div>

                <div className="col-md-4">
                  <a
                    href={`https://www.openstreetmap.org/${place.osm_type}/${place.osm_id}`}
                    target="_blank"
                    className="btn btn-info"
                  >
                    <DinaMessage id="viewDetailButtonLabel" />
                  </a>
                </div>
              </div>
              <br />
              {index < searchResults?.length - 1 && (
                <hr className="text-light" style={{ borderWidth: 3 }} />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
