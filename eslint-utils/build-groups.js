const cartesianProduct = (arrays) => {
  let result = [[]]
  for (const array of arrays) {
    result = result.flatMap((partial) =>
      array.map((item) => [...partial, item]),
    )
  }
  return result
}

const modifierCombos = ({ modifiers }) =>
  cartesianProduct(modifiers).map((combo) => combo.filter(Boolean))

const compatibleModifierCombos = ({ modifierIncompatibilities, modifiers }) =>
  modifierCombos({ modifiers }).filter((combo) => {
    const comboSet = new Set(combo)
    return combo.every((modifier) => {
      const incompatibles = modifierIncompatibilities[modifier]
      return !incompatibles || incompatibles.isDisjointFrom(comboSet)
    })
  })

const buildGroupsForSelector = ({
  modifierIncompatibilities,
  modifiers,
  selector,
  selectorIncompatibilities,
}) =>
  compatibleModifierCombos({ modifierIncompatibilities, modifiers })
    .filter((combo) =>
      selectorIncompatibilities[selector].isDisjointFrom(new Set(combo)),
    )
    .map((combo) => [...combo, selector].join('-'))

export const buildGroups = ({
  modifierIncompatibilities,
  modifiers,
  selectorIncompatibilities,
  selectors,
}) =>
  selectors.flatMap((selector) => {
    if (Array.isArray(selector)) {
      const groupPairs = selector.map((pairedSelector) =>
        buildGroupsForSelector({
          modifierIncompatibilities,
          modifiers,
          selector: pairedSelector,
          selectorIncompatibilities,
        }),
      )
      const [{ length }] = groupPairs
      return [...Array.from({ length }).keys()].map((index) =>
        groupPairs.map((groupPair) => groupPair[index]),
      )
    }
    return buildGroupsForSelector({
      modifierIncompatibilities,
      modifiers,
      selector,
      selectorIncompatibilities,
    })
  })
