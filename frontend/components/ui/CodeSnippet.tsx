"use client";

import React from "react";
import { PrismLight as SyntaxHighlighterBase, SyntaxHighlighterProps } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

// Register all languages
import js from "react-syntax-highlighter/dist/esm/languages/prism/javascript";
import ts from "react-syntax-highlighter/dist/esm/languages/prism/typescript";
import py from "react-syntax-highlighter/dist/esm/languages/prism/python";
import bash from "react-syntax-highlighter/dist/esm/languages/prism/bash";
import json from "react-syntax-highlighter/dist/esm/languages/prism/json";
import cpp from "react-syntax-highlighter/dist/esm/languages/prism/cpp";
import java from "react-syntax-highlighter/dist/esm/languages/prism/java";
import go from "react-syntax-highlighter/dist/esm/languages/prism/go";
import ruby from "react-syntax-highlighter/dist/esm/languages/prism/ruby";
import php from "react-syntax-highlighter/dist/esm/languages/prism/php";
import csharp from "react-syntax-highlighter/dist/esm/languages/prism/csharp";
import html from "react-syntax-highlighter/dist/esm/languages/prism/markup";
import css from "react-syntax-highlighter/dist/esm/languages/prism/css";
import sql from "react-syntax-highlighter/dist/esm/languages/prism/sql";
import rust from "react-syntax-highlighter/dist/esm/languages/prism/rust";
import swift from "react-syntax-highlighter/dist/esm/languages/prism/swift";
import kotlin from "react-syntax-highlighter/dist/esm/languages/prism/kotlin";
import dart from "react-syntax-highlighter/dist/esm/languages/prism/dart";
import yaml from "react-syntax-highlighter/dist/esm/languages/prism/yaml";
import markdown from "react-syntax-highlighter/dist/esm/languages/prism/markdown";
import lua from "react-syntax-highlighter/dist/esm/languages/prism/lua";
import rLang from "react-syntax-highlighter/dist/esm/languages/prism/r";
import perl from "react-syntax-highlighter/dist/esm/languages/prism/perl";
import scala from "react-syntax-highlighter/dist/esm/languages/prism/scala";
import shell from "react-syntax-highlighter/dist/esm/languages/prism/shell-session";
import powershell from "react-syntax-highlighter/dist/esm/languages/prism/powershell";
import objectivec from "react-syntax-highlighter/dist/esm/languages/prism/objectivec";
import vbnet from "react-syntax-highlighter/dist/esm/languages/prism/vbnet";
import fortran from "react-syntax-highlighter/dist/esm/languages/prism/fortran";
import haskell from "react-syntax-highlighter/dist/esm/languages/prism/haskell";
import erlang from "react-syntax-highlighter/dist/esm/languages/prism/erlang";
import clojure from "react-syntax-highlighter/dist/esm/languages/prism/clojure";
import elixir from "react-syntax-highlighter/dist/esm/languages/prism/elixir";
import julia from "react-syntax-highlighter/dist/esm/languages/prism/julia";
import groovy from "react-syntax-highlighter/dist/esm/languages/prism/groovy";

// Register languages
[
  ["javascript", js],
  ["typescript", ts],
  ["python", py],
  ["bash", bash],
  ["json", json],
  ["cpp", cpp],
  ["java", java],
  ["go", go],
  ["ruby", ruby],
  ["php", php],
  ["csharp", csharp],
  ["html", html],
  ["css", css],
  ["sql", sql],
  ["rust", rust],
  ["swift", swift],
  ["kotlin", kotlin],
  ["dart", dart],
  ["yaml", yaml],
  ["markdown", markdown],
  ["lua", lua],
  ["r", rLang],
  ["perl", perl],
  ["scala", scala],
  ["shell", shell],
  ["powershell", powershell],
  ["objectivec", objectivec],
  ["vbnet", vbnet],
  ["fortran", fortran],
  ["haskell", haskell],
  ["erlang", erlang],
  ["clojure", clojure],
  ["elixir", elixir],
  ["julia", julia],
  ["groovy", groovy],
].forEach(([name, lang]) => SyntaxHighlighterBase.registerLanguage(name, lang));

const SyntaxHighlighter: any = SyntaxHighlighterBase;

interface CodeSnippetProps {
  language: string;
  code: string;
}

export const CodeSnippet = ({ language, code }: CodeSnippetProps) => {
  return (
    <div className="my-4 rounded-md overflow-hidden bg-[#1e1e1e] border border-gray-700">
      <SyntaxHighlighter
        language={language}
        style={vscDarkPlus}
        showLineNumbers
        wrapLines
        customStyle={{ margin: 0, padding: "1rem", backgroundColor: "#1e1e1e" }}
        codeTagProps={{ style: { fontFamily: '"Fira Code", monospace' } }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
};