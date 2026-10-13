import { IntlMessageFormat } from 'intl-messageformat'
import { describe, expect, it } from 'vitest'
import { resources } from './resources'

type Tree = { [key: string]: string | Tree }

function flatten(tree: Tree, prefix = ''): Record<string, string> {
  return Object.entries(tree).reduce<Record<string, string>>((acc, [key, value]) => {
    if (typeof value === 'string') acc[prefix + key] = value
    else Object.assign(acc, flatten(value, `${prefix}${key}.`))
    return acc
  }, {})
}

const languages = Object.keys(resources) as (keyof typeof resources)[]
const namespaces = Object.keys(resources.en) as (keyof typeof resources.en)[]

describe('translations', () => {
  for (const ns of namespaces) {
    const english = Object.keys(flatten(resources.en[ns] as Tree)).sort()

    for (const language of languages.filter((l) => l !== 'en')) {
      it(`${language}/${ns} has exactly the English keys`, () => {
        expect(Object.keys(flatten(resources[language][ns] as Tree)).sort()).toEqual(english)
      })
    }

    for (const language of languages) {
      it(`${language}/${ns} messages are valid ICU`, () => {
        for (const [key, message] of Object.entries(flatten(resources[language][ns] as Tree))) {
          expect(() => new IntlMessageFormat(message, language), `${language}:${ns}:${key}`).not.toThrow()
        }
      })
    }
  }
})
