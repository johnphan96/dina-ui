import { useLocalStorage } from "@rehooks/local-storage";
import { ApiClientContext, filterBy, useQuery } from "common-ui";
import { compact, isEmpty, omitBy } from "lodash";
import { MaterialSample } from "packages/dina-ui/types/collection-api";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  PcrBatchItem,
  SeqBatch,
  SeqReaction
} from "../../../../types/seqdb-api";
import { CellGrid } from "./ContainerGrid";

interface SeqSelectCoordinatesControlsProps {
  seqBatchId: string;
  seqBatch: SeqBatch;
}

export interface SeqReactionSample {
  seqReactionId?: string;
  seqBatchId?: string;
  pcrBatchItemId?: string;
  primerId?: string;
  primerName?: string;
  primerDirection?: string;
  wellRow?: string;
  wellColumn?: number;
  sampleId?: string;
  sampleName?: string;
}

export function useSeqSelectCoordinatesControls({
  seqBatchId,
  seqBatch
}: SeqSelectCoordinatesControlsProps) {
  const { save, bulkGet } = useContext(ApiClientContext);

  const [itemsLoading, setItemsLoading] = useState<boolean>(true);

  // Whether the grid is submitting.
  const [submitting, setSubmitting] = useState(false);

  // Highlighted/selected SeqBatchItems.
  const [selectedItems, setSelectedItems] = useState<SeqReactionSample[]>([]);
  const lastSelectedItemRef = useRef<SeqReactionSample>();

  // Grid fill direction when you move multiple SeqBatchItems into the grid.
  const [fillMode, setFillMode] = useState<"COLUMN" | "ROW">("COLUMN");

  const [lastSave, setLastSave] = useState<number>();

  const [numberOfColumns, setNumberOfColumns] = useState<number>(0);

  const [numberOfRows, setNumberOfRows] = useState<number>(0);

  const [seqReactionSamples, setSeqReactionSamples] =
    useState<SeqReactionSample[]>();

  const [isStorage, setIsStorage] = useState<boolean>(false);

  const [seqReactionSortOrder, setSeqReactionSortOrder] = useLocalStorage<
    string[]
  >(`seqReactionSortOrder-${seqBatch?.id}`);

  const [gridState, setGridState] = useState({
    // Available SeqBatchItems with no well coordinates.
    availableItems: [] as SeqReactionSample[],
    // The grid of SeqBatchItems that have well coordinates.
    cellGrid: {} as CellGrid,
    // SeqBatchItems that have been moved since data initialization.
    movedItems: [] as SeqReactionSample[]
  });

  // Boolean if the grid contains any of items.
  const gridIsPopulated = useMemo(
    () => !isEmpty(gridState.cellGrid),
    [gridState]
  );

  useEffect(() => {
    if (!seqBatch) return;

    if (seqBatch?.storageRestriction) {
      setNumberOfColumns(seqBatch.storageRestriction.layout.numberOfColumns);
      setNumberOfRows(seqBatch.storageRestriction.layout.numberOfRows);
      setFillMode(
        seqBatch.storageRestriction.layout.fillDirection === "BY_ROW"
          ? "ROW"
          : "COLUMN"
      );
      setIsStorage(true);
    }
  }, [seqBatch]);

  useEffect(() => {
    if (!seqReactionSamples) return;

    fetchSamples((materialSamples) => {
      const seqBatchItemsWithSampleNames =
        seqReactionSamples.map<SeqReactionSample>((reaction) => {
          const foundSample = materialSamples.find(
            (sample) => sample.id === reaction.sampleId
          );
          return {
            ...reaction,
            sampleId: foundSample?.id,
            sampleName: foundSample?.materialSampleName ?? foundSample?.id
          };
        });

      const seqBatchItemsWithCoords = seqBatchItemsWithSampleNames.filter(
        (item) => item.wellRow && item.wellColumn
      );

      const seqBatchItemsNoCoords = seqBatchItemsWithSampleNames.filter(
        (item) => !item.wellRow && !item.wellColumn
      );

      const newCellGrid: CellGrid = {};
      seqBatchItemsWithCoords.forEach((item) => {
        newCellGrid[`${item.wellRow}_${item.wellColumn}`] = item;
      });

      setGridState({
        availableItems: sortAvailableItems(seqBatchItemsNoCoords), // seqBatchItemsNoCoords?.sort(itemSort),
        cellGrid: newCellGrid,
        movedItems: []
      });
      setItemsLoading(false);
    });
  }, [seqReactionSamples]);

  function sortAvailableItems(reactionSamples: SeqReactionSample[]) {
    if (seqReactionSortOrder) {
      const sorted = seqReactionSortOrder.map((reactionId) =>
        reactionSamples.find((item) => {
          const tempId: (string | undefined)[] = [];
          tempId.push(item.pcrBatchItemId);
          tempId.push(item.primerId);
          const id = compact(tempId).join("_");
          return id === reactionId;
        })
      );
      reactionSamples.forEach((item) => {
        const tempId: (string | undefined)[] = [];
        tempId.push(item.pcrBatchItemId);
        tempId.push(item.primerId);
        const id = compact(tempId).join("_");
        if (seqReactionSortOrder.indexOf(id) === -1) {
          sorted.push(item);
        }
      });
      return compact(sorted);
    } else {
      return compact(reactionSamples);
    }
  }

  /**
   * Taking all of the material sample UUIDs, retrieve the material samples using a bulk get
   * operation.
   */
  async function fetchSamples(callback: (response: MaterialSample[]) => void) {
    if (!seqReactionSamples) return;

    await bulkGet<MaterialSample>(
      seqReactionSamples
        .filter((item) => item.sampleId)
        .map((item) => "/material-sample/" + item.sampleId),
      { apiBaseUrl: "/collection-api" }
    ).then((response) => {
      const materialSamplesTransformed = compact(response).map<MaterialSample>(
        (resource) => ({
          materialSampleName: resource.materialSampleName,
          id: resource.id,
          type: resource.type
        })
      );

      callback(materialSamplesTransformed);
    });
  }

  // SeqBatchItem queries.
  const { loading: materialSampleItemsLoading } = useQuery<SeqReaction[]>(
    {
      filter: filterBy([], {
        extraFilters: [
          {
            selector: "seqBatch.uuid",
            comparison: "==",
            arguments: seqBatchId
          }
        ]
      })(""),
      page: { limit: 1000 },
      path: `/seqdb-api/seq-reaction`,
      include: "pcrBatchItem,seqBatch,seqPrimer"
    },
    {
      deps: [lastSave],
      onSuccess: async ({ data: seqReactions }) => {
        setItemsLoading(true);
        const seqReactionAndPcrBatchItem = compact(
          seqReactions.map(
            (item) =>
              ({
                seqBatchId: item.seqBatch?.id,
                primerId: item.seqPrimer?.id,
                primerDirection: item.seqPrimer?.direction,
                primerName: item.seqPrimer?.name,
                seqReactionId: item.id,
                pcrBatchItemId: item.pcrBatchItem?.id,
                wellColumn: item.wellColumn,
                wellRow: item.wellRow
              } as SeqReactionSample)
          )
        );
        const pcrBatchItems = compact(
          await bulkGet<PcrBatchItem, true>(
            seqReactionAndPcrBatchItem?.map(
              (item) =>
                `/pcr-batch-item/${item.pcrBatchItemId}?include=materialSample`
            ),
            {
              apiBaseUrl: "/seqdb-api",
              returnNullForMissingResource: true
            }
          )
        );

        setSeqReactionSamples(
          seqReactionAndPcrBatchItem.map((rec) => {
            const pcrBatchItem = pcrBatchItems.find(
              (item) => item.id === rec.pcrBatchItemId
            );
            return {
              ...rec,
              pcrBatchItemId: pcrBatchItem?.id,
              sampleId: pcrBatchItem?.materialSample?.id
            };
          })
        );
      }
    }
  );

  function moveItems(items: SeqReactionSample[], coords?: string) {
    setGridState(({ availableItems, cellGrid, movedItems }) => {
      // Remove the SeqBatchItem from the grid.
      const newCellGrid: CellGrid = omitBy(cellGrid, (item) =>
        items.includes(item)
      );

      // Remove the SeqBatchItem from the available SeqBatchItems.
      let newAvailableItems = availableItems.filter((s) => !items.includes(s));
      const newMovedItems = [...movedItems];

      if (coords) {
        const [rowLetter, colNumberString] = coords.split("_");
        const rowNumber = rowLetter.charCodeAt(0) - 64;

        // Double check this part
        let newCellNumber =
          fillMode === "ROW"
            ? (rowNumber - 1) * numberOfColumns + Number(colNumberString)
            : (Number(colNumberString) - 1) * numberOfRows + rowNumber;

        for (const item of items) {
          let thisItemRowNumber = -1;
          let thisItemColumnNumber = -1;

          if (fillMode === "ROW") {
            thisItemRowNumber = Math.ceil(newCellNumber / numberOfColumns);
            thisItemColumnNumber =
              newCellNumber % numberOfColumns || numberOfColumns;
          }
          if (fillMode === "COLUMN") {
            thisItemColumnNumber = Math.ceil(newCellNumber / numberOfRows);
            thisItemRowNumber = newCellNumber % numberOfRows || numberOfRows;
          }

          const thisItemCoords = `${String.fromCharCode(
            thisItemRowNumber + 64
          )}_${thisItemColumnNumber}`;

          // If there is already a SeqBatchItem in this cell, move the existing SeqBatchItem back to the list.
          const itemAlreadyInThisCell = newCellGrid[thisItemCoords];
          if (itemAlreadyInThisCell) {
            newAvailableItems.push(itemAlreadyInThisCell);
            if (!movedItems.includes(itemAlreadyInThisCell)) {
              newMovedItems.push(itemAlreadyInThisCell);
            }
          }

          // Only move the SeqBatchItem into the grid if the well is valid for this container type.
          if (newCellNumber <= numberOfColumns * numberOfRows) {
            // Move the SeqBatchItem into the grid.
            newCellGrid[thisItemCoords] = item;
          } else {
            newAvailableItems.push(item);
          }

          newCellNumber++;
        }
      } else {
        // Add the SeqBatchItem to the list.
        newAvailableItems = [...newAvailableItems, ...items];
      }

      // Set every SeqBatchItem passed into this function as moved.
      for (const item of items) {
        if (!movedItems.includes(item)) {
          newMovedItems.push(item);
        }
      }

      return {
        // availableItems: newAvailableItems.sort(itemSort),
        availableItems: sortAvailableItems(newAvailableItems), // newAvailableItems?.filter((item) => item).sort(itemSort),
        cellGrid: newCellGrid,
        movedItems: newMovedItems
      };
    });

    setSelectedItems([]);
  }

  function onGridDrop(item: SeqReactionSample, coords: string) {
    if (selectedItems.includes(item)) {
      moveItems(selectedItems, coords);
    } else {
      moveItems([item], coords);
    }
  }

  function onListDrop(item: { seqReactionSample: SeqReactionSample }) {
    moveItems([item.seqReactionSample]);
  }

  function onItemClick(item, e) {
    const { availableItems } = gridState;

    if (lastSelectedItemRef.current && e.shiftKey) {
      const currentIndex = availableItems.indexOf(item);
      const lastIndex = availableItems.indexOf(lastSelectedItemRef.current);

      const [lowIndex, highIndex] = [currentIndex, lastIndex].sort(
        (a, b) => a - b
      );

      const newSelectedItems = availableItems.slice(lowIndex, highIndex + 1);

      setSelectedItems(newSelectedItems);
    } else {
      setSelectedItems([item]);
    }

    lastSelectedItemRef.current = item;
  }

  async function gridSubmit() {
    setSubmitting(true);
    try {
      const { cellGrid, movedItems } = gridState;

      const materialSampleItemsToSave = movedItems.map((movedItem) => {
        // Get the coords from the cell grid.
        const coords = Object.keys(cellGrid).find(
          (key) => cellGrid[key] === movedItem
        );

        let newWellColumn: number | undefined;
        let newWellRow: string | undefined;
        if (coords) {
          const [row, col] = coords.split("_");
          newWellColumn = Number(col);
          newWellRow = row;
        }

        movedItem.wellColumn = newWellColumn;
        movedItem.wellRow = newWellRow;

        return movedItem;
      });

      const saveArgs = materialSampleItemsToSave.map((item) => {
        return {
          resource: {
            type: "seq-reaction",
            id: item.seqReactionId,
            wellColumn: item.wellColumn ?? null,
            wellRow: item.wellRow ?? null,
            relationships: {
              seqBatch: {
                data: {
                  id: item.seqBatchId,
                  type: "seq-batch"
                }
              },
              pcrBatchItem: {
                data: {
                  id: item.pcrBatchItemId,
                  type: "pcr-batch-item"
                }
              },
              seqPrimer: {
                data: {
                  id: item.primerId,
                  type: "pcr-primer"
                }
              }
            }
          } as SeqReaction,
          type: "seq-reaction"
        };
      });

      await save(saveArgs, { apiBaseUrl: "/seqdb-api" });

      setLastSave(Date.now());
    } catch (err) {
      alert(err);
    }
    setSubmitting(false);
  }

  function clearGrid() {
    moveItems(Object.values(gridState.cellGrid));
  }

  async function moveAll() {
    // Do not perform the move if the grid contains anything.
    // Eventually we should be able to handle this case properly.
    if (gridIsPopulated) return;

    const { availableItems, cellGrid } = gridState;
    const items = [...availableItems, ...Object.values(cellGrid)];
    moveItems(items, "A_1");
  }

  const loading = materialSampleItemsLoading || itemsLoading || submitting;

  return {
    ...gridState,
    clearGrid,
    fillMode,
    gridSubmit,
    loading,
    moveAll,
    onGridDrop,
    onListDrop,
    onItemClick,
    selectedItems,
    setFillMode,
    isStorage,
    gridIsPopulated
  };
}
