import { MultiSelect as InkMultiSelect } from "@inkjs/ui";
import { Box, render, Text, useApp } from "ink";
import { useState } from "react";

interface MultiSelectPromptProps<T extends string> {
  message: string;
  choices: readonly T[];
  defaultValues?: T[];
  onSubmit: (values: T[]) => void;
}

function MultiSelectPrompt<T extends string>({
  message,
  choices,
  defaultValues = [],
  onSubmit,
}: MultiSelectPromptProps<T>): React.ReactElement {
  const { exit } = useApp();
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<T[]>([]);

  const options = choices.map((choice) => ({
    label: choice,
    value: choice,
  }));

  const handleSubmit = (values: string[]) => {
    setResult(values as T[]);
    setSubmitted(true);
    onSubmit(values as T[]);
    exit();
  };

  if (submitted) {
    return (
      <Box>
        <Text color="cyan">? </Text>
        <Text>{message} </Text>
        <Text color="green">{result.join(", ")}</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Box>
        <Text color="cyan">? </Text>
        <Text>{message}</Text>
      </Box>
      <Box paddingLeft={2}>
        <InkMultiSelect
          defaultValue={defaultValues}
          onSubmit={handleSubmit}
          options={options}
        />
      </Box>
    </Box>
  );
}

/**
 * Show a multi-select prompt and return the user's choices.
 * Replaces inquirer's checkbox() function.
 */
export async function checkbox<T extends string>(
  message: string,
  choices: readonly T[],
  defaultValues: T[] = []
): Promise<T[]> {
  return new Promise((resolve) => {
    const { waitUntilExit } = render(
      <MultiSelectPrompt
        choices={choices}
        defaultValues={defaultValues}
        message={message}
        onSubmit={resolve}
      />
    );
    waitUntilExit();
  });
}
