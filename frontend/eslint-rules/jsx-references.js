/** Only records lexical JSX references for core no-unused-vars; it does not suppress findings. */
export default {
  meta: { type: 'problem', schema: [], messages: {} },
  create(context) {
    return {
      JSXOpeningElement(node) {
        let name = node.name;
        const member = name.type === 'JSXMemberExpression';
        while (name.type === 'JSXMemberExpression') name = name.object;
        if (name.type === 'JSXIdentifier' && (member || /^[A-Z]/.test(name.name))) {
          context.sourceCode.markVariableAsUsed(name.name, node);
        }
      },
    };
  },
};
