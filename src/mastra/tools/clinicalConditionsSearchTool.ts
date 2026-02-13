import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

export const clinicalConditionsSearchTool = createTool({
  id: 'clinical-conditions-search',
  description:
    'Search for medical conditions using the NLM Clinical Tables API. Use this ONLY to validate condition names suggested by clinical reasoning, NOT as the primary diagnostic tool. Search for specific condition names (e.g., "meningitis", "appendicitis") rather than symptoms (e.g., "headache").',
  inputSchema: z.object({
    query: z
      .string()
      .describe("Specific condition name to validate (e.g., 'meningitis', 'gastroenteritis'). NOT symptoms like 'headache' or 'fever'."),
    maxResults: z
      .number()
      .describe('Maximum number of results to return (default: 5)')
      .default(5), 
    includeExtraFields: z
      .boolean()
      .describe('Whether to include ICD-10 codes, synonyms, and info links (default: true)')
      .default(true),
  }),
  execute: async (inputData) => {
    const { query, maxResults, includeExtraFields } = inputData;

    try {
      const params = new URLSearchParams({
        terms: query,
        maxList: String(maxResults),
        df: 'consumer_name,primary_name',
        sf: 'consumer_name,primary_name,synonyms,word_synonyms',
      });

      if (includeExtraFields) {
        params.set('ef', 'icd10cm,icd10cm_codes,synonyms,info_link_data');
      }

      const url = `https://clinicaltables.nlm.nih.gov/api/conditions/v3/search?${params.toString()}`;

      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`API returned status ${response.status}`);
      }
      
      const data = await response.json();

      const total = data[0];
      const codes = data[1];
      const extraFields = data[2];
      const displayStrings = data[3];

      if (!codes || codes.length === 0) {
        return {
          success: true,
          message: `No exact condition matches found for: ${query}`,
          total: 0,
          query: query,
          conditions: [],
        };
      }

      const conditions = codes.map((code: string, index: number) => {
        const condition: Record<string, unknown> = {
          code: code,
          consumer_name: displayStrings?.[index]?.[0] || null,
          primary_name: displayStrings?.[index]?.[1] || null,
        };

        if (includeExtraFields && extraFields) {
          condition.icd10cm = extraFields.icd10cm?.[index] || null;
          condition.icd10cm_codes = extraFields.icd10cm_codes?.[index] || null;
          condition.synonyms = extraFields.synonyms?.[index] || null;
          condition.info_link_data = extraFields.info_link_data?.[index] || null;
        }

        return condition;
      });

      return {
        success: true,
        total: total,
        query: query,
        conditions: conditions,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: errorMessage,
        message: `Failed to search clinical conditions: ${errorMessage}`,
        conditions: [],
      };
    }
  },
});