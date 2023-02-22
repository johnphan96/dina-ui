import {
  DataEntryField,
  DinaFormContext,
  SelectOption,
  useApiClient
} from "../../../../common-ui/lib";
import {
  DinaMessage,
  useDinaIntl
} from "../../../../dina-ui/intl/dina-ui-intl";
import { ProtocolElement } from "../../../../dina-ui/types/collection-api/resources/ProtocolElement";
import { useContext, useEffect, useState } from "react";
import useVocabularyOptions from "../useVocabularyOptions";

export function ProtocolsField() {
  const { locale } = useDinaIntl();
  const { readOnly } = useContext(DinaFormContext) ?? {};
  const { apiClient } = useApiClient();

  const { vocabOptions: blockOptions } = useVocabularyOptions({
    path: "collection-api/vocabulary/protocolData"
  });
  const [typeOptions, setTypeOptions] = useState<SelectOption<string>[]>([]);
  const { vocabOptions: unitOptions } = useVocabularyOptions({
    path: "collection-api/vocabulary/unitsOfMeasurement"
  });

  useEffect(() => {
    async function fetchAllProtocolElements() {
      const { data } = await apiClient.get<ProtocolElement[]>(
        "collection-api/protocol-element",
        {}
      );
      const options = data.map((rec) => {
        return {
          label:
            rec.multilingualTitle?.titles?.find((item) => item.lang === locale)
              ?.title || "",
          value: rec.id
        };
      });
      setTypeOptions(options);
    }
    fetchAllProtocolElements();
  }, []);

  return (
    <DataEntryField
      legend={<DinaMessage id="protocolData" />}
      name="protocolFormData"
      blockOptions={blockOptions}
      typeOptions={typeOptions}
      unitsOptions={unitOptions}
      readOnly={readOnly}
      isTemplate={true}
      blockAddable={true}
      unitsAddable={true}
      typesAddable={true}
      isVocabularyBasedEnabledForBlock={true}
      isVocabularyBasedEnabledForType={true}
    />
  );
}
