import ts from "typescript";
import { Tag, tags } from "@lezer/highlight";
import { highlightingFor } from "@codemirror/language";
import React from "react";
import { ReactTooltip } from "./tooltip";
import cn from "clsx";

type Kind = keyof typeof ts.SymbolDisplayPartKind;
const symbolTagMap: Record<keyof typeof ts.SymbolDisplayPartKind, Tag[]> = {
  aliasName: [tags.name],
  className: [tags.className],
  enumName: [tags.typeName],
  fieldName: [tags.propertyName],
  interfaceName: [tags.className],
  keyword: [tags.keyword],
  lineBreak: [],
  numericLiteral: [tags.number],
  stringLiteral: [tags.string],
  localName: [tags.local(tags.variableName)],
  methodName: [tags.function(tags.propertyName)],
  moduleName: [tags.namespace],
  operator: [tags.operator],
  parameterName: [tags.local(tags.variableName)],
  propertyName: [tags.propertyName],
  punctuation: [tags.punctuation],
  space: [],
  text: [],
  typeParameterName: [tags.typeName],
  enumMemberName: [tags.attributeName],
  functionName: [tags.function(tags.definition(tags.variableName))],
  regularExpressionLiteral: [tags.regexp],
  link: [tags.link],
  linkName: [tags.link],
  linkText: [tags.link],
};

export const SymbolDisplay: React.FC<{
  className?: string;
  parts: ts.SymbolDisplayPart[];
}> = ({ className, parts }) => {
  const state = ReactTooltip.useEditorState();
  return (
    <p className={cn("p-1 empty:p-0", className)}>
      {parts.map((part, i) => {
        const cssClass =
          highlightingFor(state, symbolTagMap[part.kind as Kind] ?? []) ??
          undefined;
        return (
          <span key={i} className={cssClass}>
            {part.text}
          </span>
        );
      })}
    </p>
  );
};

export const TagsDisplay: React.FC<{
  className?: string;
  tags: ts.JSDocTagInfo[];
}> = ({ className, tags }) => {
  return (
    <ul className={cn("p-1 empty:p-0", className)}>
      {tags.map((tag, i) => (
        <li key={i}>
          <i>@{tag.name}</i>
          {tag.text != null && tag.text.length > 0 ? (
            <>
              <span>&nbsp;&mdash;&nbsp;</span>
              <SymbolDisplay className="inline" parts={tag.text ?? []} />
            </>
          ) : null}
        </li>
      ))}
    </ul>
  );
};
