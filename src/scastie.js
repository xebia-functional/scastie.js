import { md5 } from "./md5";

import styles from "./styles/scastie.module.css";

const scastieApiRunUrl = "https://scastie.scala-lang.org/api/run";
const scastieApiEventsUrl = "https://scastie.scala-lang.org/api/progress-sse";
const scastieWebAppUrl = "https://scastie.scala-lang.org";

const scalaVersions = {
  "Scala 3": {
    scalaVersion: "3.2.2",
    tpe: "Scala3",
  },
  "Scala 2": {
    scalaVersion: "2.13.10",
    tpe: "Jvm",
  },
  "Scala.js": {
    scalaVersion: "2.13.10",
    tpe: "Js",
  },
};

const defaultOptions = {
  _isWorksheetMode: true,
  target: {
    scalaVersion: "3.2.2",
    tpe: "Scala3",
  },
  libraries: [],
  librariesFromList: [],
  sbtConfigExtra: "scalacOptions ++= Seq()",
  sbtPluginsConfigExtra: "",
  isShowingInUserProfile: false,
};

const defaultConfig = {
  selector: "pre code",
  target: scalaVersions["Scala 3"],
  libraries: [],
  theme: {
    primary: "#002b36",
    secondary: "#e9e9ed",
    console: "#555555",
    borderRadius: "4px",
  },
};

export default function scastie(userConfig) {
  const config = {
    ...defaultConfig,
    ...userConfig,
    theme: {
      ...defaultConfig.theme,
      ...userConfig && userConfig.theme,
    },
  };
  globalThis.scastieConfig = config;

  setTheme(config.theme);

  const options = {
    ...defaultOptions,
    target: config.target,
    libraries: config.libraries,
  };

  document.querySelectorAll(config.selector).forEach(function (codeElement) {
    const id = genId(codeElement.innerText);
    codeElement.setAttribute("data-scastie-id", id);
    const code = codeElement.innerText;

    const codeOptions = {
      ...options,
      code,
    };
    sessionStorage.setItem(id, JSON.stringify(codeOptions));

    const container = addContainer(codeElement);
    addButton(
      container,
      "Options",
      "Show options for this code snippet",
      styles.optionsButton,
      showOptions,
      id
    );
    addButton(
      container,
      "Compile",
      "Compile this code snippet",
      styles.compileButton,
      compileCode,
      id
    );
    addDialog(codeElement, id, options.libraries);
    addConsole(codeElement, id);
  });
}

function setTheme(theme) {
  document.documentElement.style.setProperty(
    "--scastie-primary-colour",
    theme.primary
  );
  document.documentElement.style.setProperty(
    "--scastie-secondary-colour",
    theme.secondary
  );
  document.documentElement.style.setProperty(
    "--scastie-console-colour",
    theme.console
  );
  document.documentElement.style.setProperty(
    "--scastie-border-radius",
    theme.borderRadius
  );
}

function addContainer(element) {
  const container = document.createElement("div");
  container.classList.add(styles.container);
  element.style.position = "relative";
  element.append(container);
  return container;
}

function addButton(element, text, title, className, action, actionParam) {
  const button = document.createElement("button");
  button.classList.add(styles.button);
  button.classList.add(className);
  button.innerText = text;
  button.setAttribute("title", title);
  button.addEventListener("click", () => action(actionParam), false);
  element.insertAdjacentElement("afterbegin", button);
  return button;
}

function saveOptions(dialogId) {
  const dialog = document.querySelector(`[data-scastie-dialog='${dialogId}']`);
  const form = dialog.querySelector("form");

  const selectedOption = form.elements["scala-target"].value;

  const libraryList = form.querySelectorAll(`.${styles.libraryInput}`);
  const parsedLibraryList = Array.from(libraryList).map((libraryInput) => {
    const groupId = libraryInput.querySelector("[name=library-group]").value;
    const artifact = libraryInput.querySelector(
      "[name=library-artifact]"
    ).value;
    const version = libraryInput.querySelector("[name=library-version]").value;

    const parsedLibrary = {
      groupId,
      artifact,
      version,
      target: scalaVersions[selectedOption],
    };

    return parsedLibrary;
  });

  const currentOptions = JSON.parse(sessionStorage.getItem(dialogId));
  const options = {
    ...currentOptions,
    libraries: parsedLibraryList,
    target: scalaVersions[selectedOption],
  };

  sessionStorage.setItem(dialogId, JSON.stringify(options));
}

function addDialog(codeElement, id, libraries) {
  const dialog = document.createElement("dialog");
  dialog.classList.add(styles.dialog);
  dialog.setAttribute("data-scastie-dialog", id);
  dialog.innerHTML = dialogContent();

  dialog.addEventListener("click", (event) => {
    if (event.target.localName === "dialog") {
      dialog.close();
    }
  });
  dialog.addEventListener("close", () => saveOptions(id));

  const addButton = dialog.querySelector(`.${styles.libraryButtonAdd}`);
  addButton.addEventListener("click", () => {
    addLibraryInput(dialog);
  });

  libraries.forEach(function (library) {
    addLibraryInput(dialog, library);
  });

  codeElement.append(dialog);
}

function addLibraryInput(dialog, library = {}) {
  const newLibraryInput = createLibraryInput(library);
  const libraryListContainer = dialog.querySelector(`.${styles.libraryList}`);
  libraryListContainer.append(newLibraryInput);
}

function createLibraryInput(library = {}) {
  const libraryInput = document.createElement("div");
  libraryInput.classList.add(styles.libraryInput);

  const { groupId, artifact, version } = library;

  const content = `
        <label class="${styles.libraryInputField}">
            Group id
            <input name="library-group" value="${groupId ?? ""}" />
        </label>
        <label class="${styles.libraryInputField}">
            Artifact name
            <input name="library-artifact" value="${artifact ?? ""}" />
        </label>
        <label class="${styles.libraryInputField}">
            Version
            <input name="library-version" value="${version ?? ""}" />
        </label>
        <button class="${styles.button} ${styles.libraryButtonDelete}"
        type="button">❌</button>
    `;
  libraryInput.innerHTML = content;

  const deleteButton = libraryInput.querySelector(
    `.${styles.libraryButtonDelete}`
  );
  deleteButton.addEventListener("click", () => {
    deleteButton.parentElement.remove();
  });

  return libraryInput;
}

function dialogContent() {
  const savedOptionsVersion = globalThis.scastieConfig.target;

  return `
  <form method="dialog" class="${styles.form}">
      <fieldset class="${styles.fieldset}">
          <legend>Scala target:</legend>
          <div class="${styles.radio}">
          ${Object.entries(scalaVersions)
            .map(
              (option) =>
                `
              <label>
                  <input type="radio" name="scala-target"
                    value='${option[0]}'
                    ${
                      savedOptionsVersion.tpe === option[1].tpe ? "checked" : ""
                    } />
                  ${option[0]}
              </label>
            `
            )
            .join("")}
          </div>
      </fieldset>
      <fieldset class="${styles.fieldset}">
          <legend>Libraries:</legend>
          <div class="${styles.libraryList}"></div>
          <button class="${styles.button} ${styles.libraryButtonAdd}"
          type="button">Add</button>
      </fieldset>
      <div class="${styles.dialogButtonContainer}">
          <button class="${styles.button} ${styles.confirmButton}"
          formmethod="dialog">Confirm</button>
      </div>
  </form>
`;
}

function showOptions(id) {
  const dialog = document.querySelector(`[data-scastie-dialog='${id}']`);
  dialog.showModal();
}

function openScastieWeb(snippetId) {
  const snippetUrl = `${scastieWebAppUrl}/${snippetId}`;
  globalThis.open(snippetUrl, "_blank", "noopener, noreferrer");
}

function addConsole(codeElement, id) {
  const consoleContainer = document.createElement("pre");

  consoleContainer.classList.add(styles.console);
  consoleContainer.setAttribute("data-scastie-console-id", id);
  consoleContainer.innerText = "";
  consoleContainer.style.display = "none";

  codeElement.style.marginBottom = "0px";
  codeElement.insertAdjacentElement("afterend", consoleContainer);
}

async function compileCode(id) {
  const codeElement = document.querySelector(`[data-scastie-id='${id}']`);
  const container = codeElement.querySelector(`.${styles.container}`);

  const compileButton = codeElement.querySelector(`.${styles.compileButton}`);
  compileButton.innerText = " . . . ";
  compileButton.disabled = true;

  // Render console
  const scastieConsole = document.querySelector(
    `[data-scastie-console-id='${id}']`
  );
  scastieConsole.innerHTML = "";
  scastieConsole.style.display = "block";

  const savedOptions = sessionStorage.getItem(id);

  const requestOptions = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: savedOptions,
  };

  try {
    const response = await fetch(scastieApiRunUrl, requestOptions);
    const { base64UUID: token } = await response.json();

    container.querySelector(`.${styles.openWebButton}`) ||
      addButton(
        container,
        "↗️",
        "Open this code snippet in the Scastie web app",
        styles.openWebButton,
        openScastieWeb,
        token
      );
    const buttonList = container.querySelectorAll(`.${styles.button}`);
    buttonList.forEach(function (button) {
      button.disabled = true;
    });

    await processStream(token, scastieConsole);
  } catch (error) {
    const errorMessage = `Error: ${error}`;
    console.error(errorMessage);
    addNewLine(scastieConsole, errorMessage);
  } finally {
    compileButton.innerText = "Compile";
    const buttonList = container.querySelectorAll(`.${styles.button}`);
    buttonList.forEach(function (button) {
      button.disabled = false;
    });
  }
}

async function processStream(token, scastieConsole) {
  const evtSource = new EventSource(`${scastieApiEventsUrl}/${token}`);
  console.group(`Reading from stream ${token}`);

  return new Promise((resolve, reject) => {
    evtSource.onerror = () => {
      const genericErrorMessage =
        "Error: An error occurred while attempting to connect with the Scastie server."; //The SSE doesn't provide further info
      console.warn(genericErrorMessage);
      console.groupEnd();
      addNewLine(scastieConsole, genericErrorMessage);
      evtSource.close();
      resolve();
    };

    evtSource.onmessage = (ev) => {
      if (!ev) {
        evtSource.close();
        reject("It wasn't possible to read compilation result");
      } else {
        const obj = JSON.parse(ev.data);

        if (
          obj.sbtOutput !== undefined &&
          obj.sbtOutput.line !== undefined &&
          obj.sbtOutput.line.length > 0
        )
          if (obj.sbtOutput.line.startsWith("[error]")) {
            console.warn(obj.sbtOutput.line);
            addNewLine(scastieConsole, obj.sbtOutput.line);
          } else console.info(obj.sbtOutput.line);
        if (
          obj.userOutput !== undefined &&
          obj.userOutput.line !== undefined &&
          obj.userOutput.line.length > 0
        )
          addNewLine(scastieConsole, obj.userOutput.line);

        if (obj.isDone !== undefined && obj.isDone) {
          console.groupEnd();
          evtSource.close();
          resolve();
        }
      }
    };
  });
}

function addNewLine(scastieConsole, text) {
  scastieConsole.innerHTML += `${text} <br/>`;
}

function genId(content) {
  return md5(`${Date.now()}${content}`);
}
