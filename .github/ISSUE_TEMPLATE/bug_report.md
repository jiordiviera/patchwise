---
name: Bug Report
description: Report a bug or unexpected behavior
title: "bug: "
labels: [bug]
body:
  - type: markdown
    attributes:
      value: |
        Thanks for taking the time to fill out this bug report.
  - type: textarea
    id: description
    attributes:
      label: Describe the bug
      description: A clear and concise description of what the bug is.
    validations:
      required: true
  - type: textarea
    id: reproduction
    attributes:
      label: Steps to reproduce
      description: Steps to reproduce the behavior.
      placeholder: |
        1. Run `patchwise commit`
        2. Select a suggestion
        3. See error
    validations:
      required: true
  - type: textarea
    id: expected
    attributes:
      label: Expected behavior
      description: What did you expect to happen?
    validations:
      required: true
  - type: input
    id: version
    attributes:
      label: Version
      description: What version of patchwise are you running? (`patchwise --version`)
    validations:
      required: true
  - type: input
    id: node
    attributes:
      label: Node.js version
      description: What version of Node.js are you using?
    validations:
      required: true
  - type: textarea
    id: logs
    attributes:
      label: Relevant log output
      description: Paste any error messages or logs.
      render: shell
