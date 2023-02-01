import { useEffect, useState, useRef } from "react";
import ReactQuill from "react-quill";
import Switch from "react-switch";
import _ from "lodash";
import "./App.css";
import "quill/dist/quill.snow.css";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { styled } from "@stitches/react";
import * as Label from "@radix-ui/react-label";
import { v4 as uuidv4 } from "uuid";

const tools = [["bold", "italic", "underline"]];

const apiKey = import.meta.env.VITE_APP_API;

const API = apiKey;

const getDocumentById = (docId: string) => {
  return axios.get(`${import.meta.env.VITE_BASE_API}/document/${docId}`);
};

const removeAutoCompleteElement = () => {
  const autoCompleteElement = document.querySelectorAll(".ql-editor p span");
  (autoCompleteElement as NodeListOf<HTMLElement>).forEach((el) => {
    if (el.style.color === "rgba(117, 117, 117, 0.3)") {
      el.remove();
    }
  });
};

const TitleInput = styled("input", {
  display: "block",
  width: "100%",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 6,
  padding: "3px 10px",
  height: 45,
  fontSize: 18,
  lineHeight: 1,
  // backgroundColor: "rgba(242, 241, 238, 0.6)",
  backgroundColor: "white",
  boxShadow: `rgb(15 15 15 / 10%) 0px 0px 0px 1px inset`,
  "&:focus": {
    boxShadow: `rgb(35 131 226 / 57%) 0px 0px 0px 1px inset, rgb(35 131 226 / 35%) 0px 0px 0px 2px !important`,
  },
  "&::placeholder": {
    color: "#ababa8",
  },
});

const LabelRoot = styled(Label.Root, {
  fontSize: 12,
  fontWeight: 500,
  marginBottom: 4,
  color: "rgba(55, 53, 47, 0.65)",
});

function App() {
  const { docId } = useParams();
  const editorText = useRef("");
  const autoComplete = useRef("");
  const keyStroke = useRef(true);
  const quillRef: any = useRef(null);
  const signalRef: any = useRef(null);
  const prevValues = useRef({
    title: "",
    content: "",
  });
  const navigate = useNavigate();
  const [multiLine, setMultiLine] = useState(false);
  const [title, setTitle] = useState<string>("");

  const cleanText = (str: any) => {
    return str.replace(/(<([^>]+)>)/gi, "");
  };

  const replaceNbsps = (str: any) => {
    return str.replace(/&(nbsp|amp|quot|lt|gt);/g, " ");
  };

  const createEventListeners = () => {
    const quill = quillRef.current.editingArea;
    quill.addEventListener("keydown", (e: any) => {
      if (autoComplete.current) {
        if (e.keyCode == "9") {
          e.preventDefault();

          const autoCompleted = autoComplete.current;
          removeAutoCompleteElement();

          var n = document
            .querySelector(".ql-editor")
            ?.innerHTML.lastIndexOf("</p>");
          var str2 =
            document.querySelector(".ql-editor")?.innerHTML.substring(0, n) +
            autoCompleted.trim() +
            document.querySelector(".ql-editor")?.innerHTML.substring(n || 0);

          quillRef.current.editor.clipboard.dangerouslyPasteHTML(str2, "api");
          autoComplete.current = "";
          quillRef.current.editor.setSelection(
            editorText.current.length + autoCompleted.length
          );
        } else {
          console.log("NOT TAB KEYYYY");
          removeAutoCompleteElement();
          const space = "&nbsp;";

          var n = document
            .querySelector(".ql-editor")
            ?.innerHTML.lastIndexOf("</p>");
          var str2 =
            document.querySelector(".ql-editor")?.innerHTML.substring(0, n) +
            space +
            document.querySelector(".ql-editor")?.innerHTML.substring(n || 0);

          quillRef.current.editor.clipboard.dangerouslyPasteHTML(str2, "api");

          autoComplete.current = "";
          quillRef.current.editor.setSelection(editorText.current.length + 1);
        }
      } else {
        keyStroke.current = true;
      }
    });

    window.addEventListener("click", (e: any) => {
      if (autoComplete.current) {
        const selection = quillRef.current.unprivilegedEditor.getSelection();
        console.log(selection, "SELELTION FROM CLICK");
        removeAutoCompleteElement();
        // quillRef.current.editor.clipboard.dangerouslyPasteHTML(
        //   document.querySelector(".ql-editor")?.innerHTML
        // );
        autoComplete.current = "";
        // quillRef.current.editor.setSelection(selection.index);
      }
    });
  };

  useEffect(() => {
    createEventListeners();

    if (docId) {
      getDocumentById(docId).then((res) => {
        console.log(res, "GET DOC BY ID");
        editorText.current = res.data.data[0].body;
        setTitle(res.data.data[0].title);
        prevValues.current.content = res.data.data[0].body;
        prevValues.current.title = res.data.data[0].title;

        quillRef.current.editor.clipboard.dangerouslyPasteHTML(
          0,
          res.data.data[0].body
        );
      });
    } else {
      const newUUID = uuidv4();
      navigate(`/editor/${newUUID}`);
    }
  }, []);

  const handleFetch = async (val: any) => {
    const selection = quillRef.current.unprivilegedEditor.getSelection();
    console.log(val, "VALUUEUEUE");
    if (!keyStroke.current || !val) {
      return;
    }
    const text = replaceNbsps(cleanText(val));
    const payload = {
      text: text.trim(),
      doc_id: docId,
      cursor_position: selection.index,
    };

    /*
      Abort if the cursor is not at the end of the current text.
    */
    if (selection.index !== text.length) {
      return;
    }

    signalRef.current = new AbortController();
    const data = await fetch(API, {
      signal: signalRef.current.signal,
      method: "POST",
      body: JSON.stringify(payload),
      headers: {
        "Content-Type": "application/json",
      },
    });
    const value = await data.json();
    /*
      Checking if there is even a completion at all from the API
    */
    if (value.completion) {
      editorText.current = text;
      autoComplete.current = value.completion.trim();
      // innerHTML is <p> content here </p>
      var n = val.lastIndexOf("</p>");
      var str2 =
        val.substring(0, n) +
        `<span style="color: rgba(117, 117, 117, 0.3);" data-attr="sdsd">${value.completion.trim()}</span>` +
        val.substring(n);

      console.log(document.querySelector(".ql-editor")?.innerHTML, "innerhtml");
      quillRef.current.editor.clipboard.dangerouslyPasteHTML(str2, "api");
      quillRef.current.editor.setSelection(text.length);
      keyStroke.current = false;
    }
  };

  const handleSave = () => {
    if (
      prevValues.current.title !== title ||
      prevValues.current.content !==
        document.querySelector(".ql-editor")?.innerHTML
    ) {
    }
    axios
      .put(`${import.meta.env.VITE_BASE_API}/save`, {
        title,
        body: document.querySelector(".ql-editor")?.innerHTML,
        date: 0,
        user_id: window.localStorage.getItem("userId"),
        doc_id: docId,
      })
      .then((res) => {
        console.log(res, "RESSSS");
        prevValues.current.title = title;
        // @ts-ignore
        prevValues.current.content =
          document.querySelector(".ql-editor")?.innerHTML;
      });
  };

  const debounceHandleFetch = _.debounce(handleFetch, 1000);
  const debounceSave = _.debounce(handleSave, 4000);
  const handleChange = (val: string) => {
    if (signalRef.current) {
      signalRef.current.abort();
    }
    debounceHandleFetch(val);
    debounceSave();
  };

  useEffect(() => {
    debounceSave();
  }, [title]);

  console.log(
    editorText,
    quillRef.current,
    document.querySelector(".ql-editor")?.innerHTML
  );
  return (
    <>
      <section className="p-8">
        <div className="max-w-3xl mx-auto mb-4">
          <LabelRoot htmlFor="email">Title</LabelRoot>
          <TitleInput
            placeholder="New Title here...."
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
            }}
          />
        </div>
        <div className="App max-w-3xl flex flex-col mx-auto my-0 rounded-lg bg-white">
          <label className="multi-suggestion flex items-center mt-1"></label>
          <ReactQuill
            placeholder="start writing something..."
            className="w-full quill-container"
            onChangeSelection={(e: any) => {
              if (
                autoComplete.current &&
                e.index >= editorText.current.length
              ) {
                quillRef.current.editor.setSelection(editorText.current.length);
              }
            }}
            modules={{
              toolbar: tools,
              history: {
                userOnly: true,
              },
            }}
            ref={quillRef}
            onChange={handleChange}
            defaultValue={editorText.current}
          />
        </div>
      </section>

      <footer className="flex justify-center sticky mt-4">
        2022 @ scrible
      </footer>
    </>
  );
}

export default App;
