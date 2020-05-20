import Kitsu, { KitsuResource, PersistedResource } from "kitsu";
import { deserialise } from "kitsu-core";
import React, { useContext } from "react";
import { serialize } from "../util/serialize";
import {
  FailedOperation,
  Operation,
  OperationsResponse,
  SuccessfulOperation
} from "./operations-types";

/** Api context interface. */
export interface ApiClientContextI {
  /** Client to talk to the back-end API. */
  apiClient: Kitsu;

  /** Function to perform requests against a jsonpatch-compliant JSONAPI server. */
  doOperations: (operations: Operation[]) => Promise<SuccessfulOperation[]>;

  /** Creates or updates one or multiple resources. */
  save: (
    saveArgs: SaveArgs[]
  ) => Promise<Array<PersistedResource<KitsuResource>>>;

  /** Bulk GET operations: Run many find-by-id queries in a single HTTP request. */
  bulkGet: <T extends KitsuResource>(
    paths: string[]
  ) => Promise<Array<PersistedResource<T>>>;
}

/** Config for creating an API client context value. */
export interface ApiClientContextConfig {
  /** Back-end API base URL. */
  baseURL?: string;

  /**
   * Temp ID iterator.
   * This is not persisted on the back-end as the actual database ID.
   * The generated ID should be in the back-end's expected format (e.g. number or UUID).
   */
  getTempIdGenerator?: () => () => string;

  headers?: Record<string, string>;
}

/** save function args. */
export interface SaveArgs<T extends KitsuResource = KitsuResource> {
  resource: T;
  type: string;
}

/**
 * React context that passes down a single API client to subscribed components.
 */
export const ApiClientContext = React.createContext<ApiClientContextI>(
  // Default value is undefined. This won't matter as long as the hook is called inside the context provider.
  undefined as any
);

/**
 * Creates the value of the API client context. The app should only need to call this function
 * once to initialize the context.
 */
export function createContextValue({
  baseURL = "/api",
  getTempIdGenerator = () => {
    let idIterator = -100;
    return () => String(idIterator--);
  },
  headers = {}
}: ApiClientContextConfig = {}): ApiClientContextI {
  const apiClient = new Kitsu({
    baseURL,
    headers: { "Crnk-Compact": "true", ...headers },
    pluralize: false,
    resourceCase: "none"
  });

  /**
   * Performs a write operation against a jsonpatch-compliant JSONAPI server.
   */
  async function doOperations(
    operations: Operation[]
  ): Promise<SuccessfulOperation[]> {
    // Unwrap the configured axios instance from the Kitsu instance.
    const { axios } = apiClient;

    // Do the operations request.
    const axiosResponse = await axios.patch("operations", operations, {
      headers: {
        Accept: "application/json-patch+json",
        "Content-Type": "application/json-patch+json",
        "Crnk-Compact": "true"
      }
    });

    // Check for errors. At least one error means that the entire request's transaction was
    // cancelled.
    const errorMessage = getErrorMessage(axiosResponse.data);

    // If there is an error message, throw it.
    if (errorMessage) {
      throw new Error(errorMessage);
    }

    // Return the successful jsonpatch response.
    return axiosResponse.data;
  }

  /**
   * Creates or updates one or multiple resources.
   */
  async function save(
    saveArgs: SaveArgs[]
  ): Promise<Array<PersistedResource<KitsuResource>>> {
    // Serialize the resources to JSONAPI format.
    const serializePromises = saveArgs.map(saveArg => serialize(saveArg));
    const serialized = await Promise.all(serializePromises);

    // Temp ID iterator. This is not persisted on the back-end as the actual database ID.
    const generateId = getTempIdGenerator();

    // Create the jsonpatch oeprations objects.
    const operations = serialized.map<Operation>(jsonapiResource => ({
      op: jsonapiResource.id ? "PATCH" : "POST",
      path: jsonapiResource.id
        ? `${jsonapiResource.type}/${jsonapiResource.id}`
        : jsonapiResource.type,
      value: {
        ...jsonapiResource,
        id: String(jsonapiResource.id || generateId())
      }
    }));

    // Do the operations request.
    const responses = await doOperations(operations);

    // Deserialize the responses to Kitsu format.
    const deserializePromises = responses.map(response =>
      deserialise(response)
    );
    const deserialized = await Promise.all(deserializePromises);
    const kitsuResources = deserialized.map(({ data }) => data);

    return kitsuResources;
  }

  /** Bulk GET operations: Run many find-by-id queries in a single HTTP request. */
  async function bulkGet<T extends KitsuResource>(paths: string[]) {
    const getOperations = paths.map<Operation>(path => ({
      op: "GET",
      path
    }));

    const responses = await doOperations(getOperations);

    const resources: Array<PersistedResource<T>> = (
      await Promise.all(responses.map(deserialise))
    ).map(res => res.data);

    return resources;
  }

  return {
    apiClient,
    bulkGet,
    doOperations,
    save
  };
}

/** Gets the error message as a string from the JSONAPI jsonpatch/operations response. */
function getErrorMessage(
  operationsResponse: OperationsResponse
): string | null {
  // Filter down to just the error responses.
  const errorResponses = operationsResponse.filter(
    ({ status }) => !/2../.test(status.toString())
  ) as FailedOperation[];

  // Map the error responses to JsonApiErrors.
  const jsonApiErrors = errorResponses
    // Ignore any error responses without an 'errors' field.
    .filter(response => response.errors)
    .map(response => response.errors);

  // Convert the JsonApiErrors to an aggregated error string.
  const message = jsonApiErrors
    .map(errors =>
      errors.map(({ title, detail }) => `${title}: ${detail}`).join("\n")
    )
    .join("\n");

  // Return the error message if there is one, or null otherwise.
  return message || null;
}
