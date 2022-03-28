import { QueryRowExportProps } from "../query-builder/QueryRow";
import Bodybuilder from "bodybuilder";
import { LimitOffsetPageSpec } from "..";

export interface TransformQueryToDSLParams {
  queryRows: QueryRowExportProps[];
  group: string;
}

export function transformQueryToDSL(
  pagination: LimitOffsetPageSpec,
  submittedValues: TransformQueryToDSLParams
) {
  const builder = Bodybuilder();

  /**
   * Formik will store the values in different spots depending on the queryRow type.
   * 
   * This helper function will retrieve the value based on the type.
   * 
   * @param queryRow 
   * @returns value based on the query row type.
   */
  function getValueBasedOnType(queryRow) {
    switch (queryRow.type) {
      // Boolean type
      case "boolean":
        return queryRow.boolean;

      // Number types
      case "long":
      case "short":
      case "integer":
      case "byte":
      case "double":
      case "float":
      case "scaled_float":
      case "unsigned_long":
        return queryRow.number;

      // Date type
      case "date":
        return queryRow.date;

      // Text types
      case "text":
      case "keyword":
        return queryRow.matchValue ?? ""

      default:
        return null;
    }
  }

  function getMatchType(queryRow) {
    switch (queryRow.type) {
      // Text based input can also have exact or partial matches.
      case "text":
      case "keyword":
        return queryRow.matchType as string

      default:
        return "term"
    }
  }

  function getFieldName(queryRow) {
    if (queryRow.matchType === "term") return queryRow.fieldName + ".keyword";
    return queryRow.fieldName;
  }

  function buildRelationshipQuery(rowToBuild) {
    // The type can change some of these fields below. 
    const value = getValueBasedOnType(rowToBuild);
    const type = getMatchType(rowToBuild);
    const fieldName = getFieldName(rowToBuild);

    // Create a nested query for each relationship type query.
    builder.query("nested", { path: "included" }, (queryBuilder) => {
      return queryBuilder
        .andQuery("match", "included.type", rowToBuild.parentName)
        .andQuery(type, fieldName.replace("included.", "included.attributes."), value)
    })
  }

  /**
   * Used for attributes directly involved with the index. Relationship queries should be using
   * the buildRelationshipQuery function instead.
   * 
   * @param rowToBuild
   */
  function buildQuery(rowToBuild) {
    // The type can change some of these fields below.
    const value = getValueBasedOnType(rowToBuild);
    const type = getMatchType(rowToBuild);
    const fieldName = getFieldName(rowToBuild);

    // Currently only AND is supported, so this acts just like a AND.
    builder.query(type, fieldName, value);
  }

  // Remove the row that user did not select any field to search on or
  // no value is put for the selected field
  submittedValues.queryRows.filter(queryRow =>
    queryRow.fieldName &&
    ((queryRow.type === "boolean" && queryRow.boolean) ||
      ((queryRow.type === "long" ||
        queryRow.type === "short" ||
        queryRow.type === "integer" ||
        queryRow.type === "byte" ||
        queryRow.type === "double" ||
        queryRow.type === "float" ||
        queryRow.type === "half_float" ||
        queryRow.type === "scaled_float" ||
        queryRow.type === "unsigned_long") &&
        queryRow.number) ||
      (queryRow.type === "date" && queryRow.date) ||
      ((queryRow.type === "text" || queryRow.type === "keyword") &&
        queryRow.matchType &&
        queryRow.matchValue))
  ).map((queryRow) => {

    // Determine if the attribute is inside a relationship.
    if (queryRow.parentName) {
      buildRelationshipQuery(queryRow);
    } else {
      buildQuery(queryRow);
    }
  });

  // Add the search group filter.
  if (
    Array.isArray(submittedValues.group) &&
    submittedValues.group.length > 0
  ) {
    builder.andFilter("terms", "data.attributes.group", submittedValues.group);
  } else if (!Array.isArray(submittedValues.group) && submittedValues.group) {
    builder.andFilter("term", "data.attributes.group", submittedValues.group);
  }

  // Apply pagination rules to elastic search query.
  if (pagination) {
    builder.size(pagination.limit);
    builder.from(pagination.offset);
  }

  return builder.build();
}
