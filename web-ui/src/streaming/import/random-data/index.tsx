// Displays a form with random settings to configure what values are generated
// for a given field in a table.

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Autocomplete, FormHelperText, Grid, TextField } from '@mui/material'
import { Controller, useWatch } from 'react-hook-form'
import dayjs, { Dayjs } from 'dayjs'

import { useCustomForm } from '../hooks/useCustomForm'
import { Field } from 'src/types/manager'
import { getValueParser } from 'src/types/ddl'
import { IRngGenMethod, columnTypeToRngOptions, getRngMethodByName } from './generators'
import { ExampleDisplay } from './ExampleDisplay'
import { StoredFieldSettings } from '../RngSettingsDialog'
import { StoreSettingsFn } from '../ImportToolbar'

// The names of potential form field parameters.
export enum FieldNames {
  BOOL_CONST = 'bool_const',
  TRUE_PCT = 'true_pct',
  VALUE = 'value',
  MIN = 'min',
  MAX = 'max',
  MU = 'mu',
  SIGMA = 'sigma',
  LAMBDA = 'lambda',
  ALPHA = 'alpha',
  BETA = 'beta',
  TIME = 'time',
  TIME2 = 'time2',
  DATE_RANGE = 'date_range'
}

export const RngFieldSettings = (props: {
  field: Field
  fieldSettings: StoredFieldSettings | undefined
  setSettings: StoreSettingsFn
}) => {
  const { field, fieldSettings, setSettings } = props

  const defaultValues: Partial<Record<FieldNames, any>> = useMemo(() => {
    return {
      bool_const: false,
      true_pct: '0.5',
      value: '0',
      min: '0',
      max: '100',
      mu: '100',
      sigma: '10',
      lambda: '0.1',
      alpha: '0.1',
      beta: '0.1',
      time: dayjs(new Date(2023, 1, 1, 0, 0)),
      time2: dayjs(new Date(2023, 12, 1, 23, 59, 59)),
      date_range: [dayjs(new Date(2023, 1, 1, 0, 0)), dayjs(new Date(2023, 12, 1, 23, 59, 59))]
    }
  }, [])

  // The current random generation method that was selected.
  const [selectedMethod, setSelectedMethod] = useState<IRngGenMethod | null>(
    fieldSettings ? getRngMethodByName(fieldSettings.method, field.columntype) : null
  )
  // An random example value that is generated if a method is selected.
  const [example, setExample] = useState<boolean | number | string | object | Dayjs | undefined>(undefined)
  const [parsedExample, setParsedExample] = useState<boolean | number | string | undefined>(undefined)

  // Instantiate a react hook form.
  //
  // We use a custom hook that allows us to change the validation schema on the
  // fly.
  const {
    control,
    updateSchema,
    clearErrors,
    formState: { errors, isValid, isDirty }
  } = useCustomForm({
    mode: 'onChange',
    schema: selectedMethod?.validationSchema?.(field.columntype),
    defaultValues: fieldSettings?.config ?? defaultValues
  })

  // Reset the form when we change the category
  const handleCategoryChange = useCallback(
    (event: React.SyntheticEvent<Element, Event>, method: IRngGenMethod | null) => {
      setSelectedMethod(method)
      if (method && method.validationSchema) {
        updateSchema(method.validationSchema(field.columntype))
        clearErrors()
        setSettings(prev => {
          const newSettings = new Map(prev)
          newSettings.set(field.name, {
            method: method.title,
            config: defaultValues
          })
          return newSettings
        })
      }
    },
    [updateSchema, field, clearErrors, setSettings, defaultValues]
  )

  // Define a callback to validate the form.
  //
  // We use our own validation callback to update the example.
  //
  // It would be better to use the `isValid` property from react-hook-form,
  // unfortunately when using the {method: 'onChange'} for validation, the
  // isValid property lags behind re-rendering cycles and so the `myFormData`
  // can be invalid but `isValid` is still true.
  //
  // See this issue about it:
  // https://github.com/react-hook-form/react-hook-form/issues/3750
  const validateCallback = useCallback(
    (data: any) => {
      if (selectedMethod && selectedMethod.validationSchema && selectedMethod.validationSchema(field.columntype)) {
        try {
          const objectSchema = selectedMethod.validationSchema(field.columntype)
          if (objectSchema) {
            // will throw an error if validation fails
            objectSchema.validateSync(data)
          }
          return true
        } catch (e) {
          return false
        }
      } else {
        return true
      }
    },
    [selectedMethod, field]
  )

  // We generate a new example whenever we change something in the form.
  // We also store the new config in LocalStorage.
  const myFormData = useWatch({ control })
  useEffect(() => {
    if (selectedMethod && validateCallback(myFormData)) {
      const newExample = selectedMethod.generator(field.columntype, myFormData)
      setExample(newExample)
      setParsedExample(getValueParser(field.columntype)(newExample))
      setSettings(prev => {
        const newSettings = new Map(prev)
        newSettings.set(field.name, { method: selectedMethod.title, config: myFormData })
        return newSettings
      })
    } else {
      setExample(undefined)
      setSettings(prev => {
        const newSettings = new Map(prev)
        newSettings.delete(field.name)
        return newSettings
      })
    }
  }, [myFormData, selectedMethod, field, isDirty, setSettings, validateCallback, defaultValues])

  return (
    <>
      <Grid item sm={4} xs={12}>
        <Autocomplete
          fullWidth={false}
          onChange={handleCategoryChange}
          groupBy={option => option.category}
          getOptionLabel={option => option.title || ''}
          renderInput={params => <TextField {...params} label='Generator' />}
          options={columnTypeToRngOptions(field.columntype)}
          isOptionEqualToValue={(option, value) => option.title === value.title}
          value={selectedMethod}
        />
      </Grid>

      {selectedMethod?.form_fields?.(field).map(
        ff =>
          ff.props.name && (
            <Grid item sm={ff.sm} xs={12} key={ff.props.name}>
              <Controller
                name={ff.props.name}
                control={control}
                render={({ field }) => <ff.component {...field} {...ff.props} error={Boolean(errors[ff.props.name])} />}
              />
              {errors[ff.props.name] && (
                <FormHelperText sx={{ color: 'error.main' }}>
                  {errors[ff.props.name]!.message?.toString()}
                </FormHelperText>
              )}
            </Grid>
          )
      )}

      {selectedMethod && isValid && example !== undefined && parsedExample !== undefined && (
        <ExampleDisplay example={example} parsed={parsedExample} field={field} />
      )}
    </>
  )
}
