'use client';

import React, { useState, useEffect, useCallback } from 'react';

interface FormField {
  value: string;
  error?: string;
  touched?: boolean;
  validating?: boolean;
}

interface ValidationRule {
  validate: (value: string) => boolean | string;
  message: string;
}

interface UseFormValidationOptions {
  initialValues?: Record<string, string>;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  validateOnSubmit?: boolean;
}

interface ValidationRules {
  [key: string]: ValidationRule[];
}

export function useFormValidation(
  rules: ValidationRules,
  options: UseFormValidationOptions = {}
) {
  const {
    validateOnChange = true,
    validateOnBlur = true,
    validateOnSubmit = true,
  } = options;

  const [fields, setFields] = useState<Record<string, FormField>>(() => {
    const initial: Record<string, FormField> = {};
    Object.keys(rules).forEach((key) => {
      initial[key] = {
        value: options.initialValues?.[key] || '',
        touched: false,
        error: undefined,
        validating: false,
      };
    });
    return initial;
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValid, setIsValid] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const validateField = useCallback(
    (name: string, value: string): string | undefined => {
      const fieldRules = rules[name];
      if (!fieldRules) return undefined;

      for (const rule of fieldRules) {
        const result = rule.validate(value);
        if (result !== true) {
          return typeof result === 'string' ? result : rule.message;
        }
      }
      return undefined;
    },
    [rules]
  );

  const validateAllFields = useCallback((): boolean => {
    const errors: Record<string, string | undefined> = {};
    let hasErrors = false;

    Object.keys(rules).forEach((name) => {
      const error = validateField(name, fields[name]?.value || '');
      errors[name] = error;
      if (error) hasErrors = true;
    });

    setFields((prev) => {
      const updated = { ...prev };
      Object.keys(errors).forEach((name) => {
        updated[name] = { ...updated[name], error: errors[name], touched: true };
      });
      return updated;
    });

    return !hasErrors;
  }, [rules, validateField, fields]);

  const handleChange = useCallback(
    (name: string, value: string) => {
      setFields((prev) => ({
        ...prev,
        [name]: { ...prev[name], value, touched: true },
      }));

      if (validateOnChange) {
        const error = validateField(name, value);
        setFields((prev) => ({
          ...prev,
          [name]: { ...prev[name], error },
        }));
      }
    },
    [validateOnChange, validateField]
  );

  const handleBlur = useCallback(
    (name: string) => {
      setFields((prev) => ({
        ...prev,
        [name]: { ...prev[name], touched: true },
      }));

      if (validateOnBlur) {
        const error = validateField(name, fields[name]?.value || '');
        setFields((prev) => ({
          ...prev,
          [name]: { ...prev[name], error },
        }));
      }
    },
    [validateOnBlur, validateField, fields]
  );

  const handleSubmit = useCallback(
    (onSubmit: (values: Record<string, string>) => void | Promise<void>) => {
      return async (e?: React.FormEvent) => {
        e?.preventDefault();
        setSubmitted(true);

        if (validateOnSubmit) {
          const isValid = validateAllFields();
          if (!isValid) return;
        }

        setIsSubmitting(true);
        try {
          const values: Record<string, string> = {};
          Object.keys(fields).forEach((key) => {
            values[key] = fields[key].value;
          });
          await onSubmit(values);
        } finally {
          setIsSubmitting(false);
        }
      };
    },
    [validateOnSubmit, validateAllFields, fields]
  );

  const reset = useCallback((newValues?: Record<string, string>) => {
    const resetValues = newValues || {};
    setFields((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((key) => {
        updated[key] = {
          value: resetValues[key] ?? prev[key].value,
          touched: false,
          error: undefined,
          validating: false,
        };
      });
      return updated;
    });
    setSubmitted(false);
    setIsSubmitting(false);
  }, []);

  useEffect(() => {
    const valid = Object.values(fields).every(
      (field) => !field.error && field.value
    );
    setIsValid(valid);
  }, [fields]);

  return {
    fields,
    handleChange,
    handleBlur,
    handleSubmit,
    reset,
    isSubmitting,
    isValid,
    submitted,
    setFieldValue: (name: string, value: string) => {
      setFields((prev) => ({
        ...prev,
        [name]: { ...prev[name], value },
      }));
    },
    setFieldError: (name: string, error: string | undefined) => {
      setFields((prev) => ({
        ...prev,
        [name]: { ...prev[name], error },
      }));
    },
  };
}

export const validationRules = {
  required: (message = 'This field is required'): ValidationRule => ({
    validate: (value) => value.trim().length > 0,
    message,
  }),

  email: (message = 'Please enter a valid email address'): ValidationRule => ({
    validate: (value) => {
      if (!value) return true;
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(value);
    },
    message,
  }),

  phone: (message = 'Please enter a valid phone number'): ValidationRule => ({
    validate: (value) => {
      if (!value) return true;
      const phoneRegex = /^[\d\s\-+()]{10,}$/;
      return phoneRegex.test(value);
    },
    message,
  }),

  minLength: (length: number, message?: string): ValidationRule => ({
    validate: (value) => value.length >= length,
    message: message || `Must be at least ${length} characters`,
  }),

  maxLength: (length: number, message?: string): ValidationRule => ({
    validate: (value) => value.length <= length,
    message: message || `Must be no more than ${length} characters`,
  }),

  pattern: (regex: RegExp, message = 'Invalid format'): ValidationRule => ({
    validate: (value) => regex.test(value),
    message,
  }),

  match: (fieldName: string, getOtherValue: () => string, message?: string): ValidationRule => ({
    validate: (value) => value === getOtherValue(),
    message: message || `Must match ${fieldName}`,
  }),

  custom: (
    validator: (value: string) => boolean,
    message: string
  ): ValidationRule => ({
    validate: validator,
    message,
  }),
};

export function FormFieldError({ error }: { error?: string }) {
  if (!error) return null;
  return (
    <p role="alert" className="mt-1 text-sm text-error-500">
      {error}
    </p>
  );
}

export const FormFieldLabel: React.FC<{
  htmlFor?: string;
  children: React.ReactNode;
  required?: boolean;
}> = ({ htmlFor, children, required }) => (
  <label
    htmlFor={htmlFor}
    className="block text-sm font-medium text-gray-700 mb-1"
  >
    {children}
    {required && <span className="text-error-500 ml-1">*</span>}
  </label>
);
