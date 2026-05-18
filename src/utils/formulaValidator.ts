import type { FormulaToken, FormulaValidationResult } from '@/types/formula'

const isOperand = (token: FormulaToken): boolean => token.type === 'metric' || token.type === 'constant'

const isOperator = (token: FormulaToken): boolean => token.type === 'operator'

const isZeroConstant = (token: FormulaToken | undefined): boolean =>
  token?.type === 'constant' && token.constantValue === 0

export const validateFormulaTokens = (tokens: FormulaToken[]): FormulaValidationResult => {
  if (tokens.length === 0) {
    return {
      valid: false,
      message: '公式不能为空',
    }
  }

  let balance = 0

  for (const [index, token] of tokens.entries()) {
    if (token.type === 'parenthesis') {
      balance += token.parenthesis === '(' ? 1 : -1

      if (balance > 1) {
        return {
          valid: false,
          message: '当前版本仅支持一层括号',
        }
      }

      if (balance < 0) {
        return {
          valid: false,
          message: '右括号不能出现在左括号之前',
        }
      }
    }

    const previous = tokens[index - 1]
    const next = tokens[index + 1]

    if (previous?.type === 'parenthesis' && previous.parenthesis === '(' && token.type === 'parenthesis' && token.parenthesis === ')') {
      return {
        valid: false,
        message: '括号内不能为空',
      }
    }

    if (previous && isOperand(previous) && isOperand(token)) {
      return {
        valid: false,
        message: '两个指标或常数之间需要运算符',
      }
    }

    if (previous && isOperator(previous) && isOperator(token)) {
      return {
        valid: false,
        message: '不能连续输入两个运算符',
      }
    }

    if (token.operator === '/' && isZeroConstant(next)) {
      return {
        valid: false,
        message: '分母不能为 0',
      }
    }
  }

  const first = tokens[0]
  const last = tokens[tokens.length - 1]

  if (!first || isOperator(first)) {
    return {
      valid: false,
      message: '公式不能以运算符开头',
    }
  }

  if (!last || isOperator(last)) {
    return {
      valid: false,
      message: '公式不能以运算符结尾',
    }
  }

  if (balance !== 0) {
    return {
      valid: false,
      message: '括号未闭合',
    }
  }

  return {
    valid: true,
    message: '公式校验通过',
  }
}
