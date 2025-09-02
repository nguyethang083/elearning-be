export const calculator = {
  name: 'calculator',
  description: 'Calculate mathematical expressions',
  parameters: {
    type: 'object',
    properties: {
      expression: {
        type: 'string',
        description: 'The mathematical expression to evaluate'
      }
    },
    required: ['expression']
  },
  execute: async ({ expression }) => {
    try {
      // Sanitize the expression to prevent code injection
      const sanitizedExpression = expression.replace(/[^0-9+\-*/()., ]/g, '');
      
      // Use Function constructor for safe evaluation
      const result = Function(`'use strict'; return (${sanitizedExpression})`)();
      
      return {
        result: result,
        expression: expression,
        explanation: `Calculated: ${expression} = ${result}`
      };
    } catch (error) {
      return {
        error: 'Invalid mathematical expression',
        expression: expression
      };
    }
  }
}; 