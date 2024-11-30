
import { MajorMinorType } from '@/types';

// Function that performs a "smart search," allowing users to search for a major/minor both by the program's code (ex. COS)
// and the program's precise name (ex. Computer Science).
export const smartSearch = (
    query: string,
    options: MajorMinorType[]
  ): MajorMinorType[] => { 
    if (!query) return options;
    const trimmedQuery = query.trim(); // Process the query (user's input), deleting whitespace as necessary.
    if (trimmedQuery.length === 0) return options; 

    return options.filter((option) => 
        option.code.toUpperCase().startsWith(trimmedQuery.toUpperCase()) ||
        option.name.toLowerCase().startsWith(trimmedQuery.toLowerCase())
    );
}

export const isOptionEqual = (option: MajorMinorType, value: MajorMinorType): boolean => {
    if (!option || !value) return false;
    return option.code === value.code;
};
