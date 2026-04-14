import nextCoreWebVitals from "eslint-config-next/core-web-vitals"
import nextTypeScript from "eslint-config-next/typescript"

export default [
  ...nextCoreWebVitals,
  ...nextTypeScript,
  {
    ignores: [".next/**", "node_modules/**"],
  },
  {
    rules: {
      "import/no-anonymous-default-export": "off",
      "react-hooks/purity": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
]
