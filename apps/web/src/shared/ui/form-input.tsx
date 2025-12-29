import type { ComponentProps, JSX } from "react";

import { type FieldPath, type FieldValues, useFormContext } from "react-hook-form";

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/ui/form";
import { Input } from "@/shared/ui/input";

type FormInputProps<TFieldValues extends FieldValues, TName extends FieldPath<TFieldValues>> = {
  name: TName;
  label: string;
  description?: string;
} & Omit<ComponentProps<typeof Input>, "name">;

// Overload for better autocomplete
export function FormInput<TFieldValues extends FieldValues>(
  props: FormInputProps<TFieldValues, FieldPath<TFieldValues>>,
): JSX.Element;

// Implementation
export function FormInput<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({ name, label, description, ...inputProps }: FormInputProps<TFieldValues, TName>) {
  const { control } = useFormContext<TFieldValues>();

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          {description && <FormDescription>{description}</FormDescription>}
          <FormControl>
            <Input {...field} {...inputProps} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
