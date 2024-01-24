import { Box, Button, Grid, TextField, Typography } from "@mui/material";
import { userAtom } from "../states/userAtom";
import { useRecoilState, useSetRecoilState } from "recoil";
import { saveMemo } from "../services/saveMemo";
import { messageAtom } from "../states/messageAtom";
import { useNavigate, useParams } from "react-router-dom";
import { searchMemoById } from "../services/searchMemo";
import { exceptionMessage, successMessage } from "../utils/messages";
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import './toolbar.css';
import { useEffect, useState } from 'react';//suzu
import { WithContext as ReactTags } from 'react-tag-input';//suzu
import { OpenAI } from "openai";
import { collection, getDocs } from 'firebase/firestore';
import { database } from "../infrastructure/firebase";
import './Memo.css';

export function Memo(): JSX.Element {
  const [loginUser] = useRecoilState(userAtom);
  const setMessageAtom = useSetRecoilState(messageAtom);
  const [isGeneratingTags, setIsGeneratingTags] = useState(false);
  const [title, setTitle] = useState("");
  const [titleError, setTitleError] = useState(false);
  const [content, setContent] = useState("");

  let openai: OpenAI;
  if (loginUser?.apiKey) {
    openai = new OpenAI({
      apiKey: loginUser.apiKey,
      dangerouslyAllowBrowser: true
    });
  }

  const [tags, setTags] = useState<Tag[]>([]);

  interface Tag {
    id: string;
    text: string;
  }

  const manuallyGenerateTags = async () => {
    setIsGeneratingTags(true); // タグ生成開始
    const generatedTags = await generateTags(content);
    generatedTags.forEach((tag, index) => {
      if (tag.text.match(/#/g)?.length !== 1) {
        generatedTags.splice(index, 1);
      }
    });
    const newTags = [...tags, ...generatedTags];
    const uniqueTags = newTags.filter((tag, index, self) => self.findIndex((t) => t.text === tag.text) === index);
    setTags(uniqueTags);
    setIsGeneratingTags(false); // タグ生成終了
  };

  const handleDelete = (i: number) => {
    setTags(tags.filter((tag, index) => index !== i));
  };

  const handleAddition = (tag: Tag) => {
    const formattedTag = { id: tag.id, text: `#${tag.text}` };
    setTags([...tags, formattedTag]);
  };

  const handleDrag = (tag: Tag, currPos: number, newPos: number) => {
    const newTags = tags.slice();
    newTags.splice(currPos, 1);
    newTags.splice(newPos, 0, tag);
    setTags(newTags);
  };

  const getMemoCount = async (userId :string) => {
    const memosSnapshot = await getDocs(collection(database, "users", userId, "memos"));
    return memosSnapshot.docs.length;
  };

  const params = useParams();
  const id = params.id;
  const screenTitle = (!id ? "Create" : "Update") + " memo";

  const navigate = useNavigate();
  const [createdAt, setCreatedAt] = useState<Date | null>(null);

  const backToMemoList = () => {
    navigate("/memolist");
  };

  const generateTags = async (content: string): Promise<Tag[]> => {
    if (!openai) {
      return [];
    }
  
    const textcontent = content.replace(/<[^>]*>?/gm, '');
  
    if (textcontent === "") {
      return [];
    }
    else {
      const gptResponse = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{"role": "user", "content": "与えられたテキストから適切なハッシュタグを生成してください。テキストの主要なトピックやキーワードを考慮し、関連性の高いタグを提案してください。"}, {"role": "user", "content": textcontent}],
        temperature: 0.5,
        max_tokens: 60,
      });

      const messageContent = gptResponse.choices[0].message.content;
      if (messageContent === null) {
        return [];
      }
      const tags = messageContent.split(" ").map((tag, index) => {
        return { id: index.toString(), text: tag };
      });
      return tags;
    }
  };

  const save = async () => {
    if (!title) {
      setTitleError(true);
      return;
    }
    if (loginUser && loginUser.userId) {
      const updatedAt = new Date();
      let memoCreatedAt = createdAt;
      if (!id && !createdAt) {
        setCreatedAt(() => {
          memoCreatedAt = new Date();
          return memoCreatedAt;
        });
      }
      if (memoCreatedAt) {
        try {
          let orderValue =0;
          if (!id) {
            orderValue = await getMemoCount(loginUser.userId);
          }
          await saveMemo({ id, title, content, tags, updatedAt, createdAt: memoCreatedAt, order:orderValue }, loginUser);
          setMessageAtom((prev) => ({
            ...prev,
            ...successMessage("Saved"),
          }));
          navigate("/memolist");
          return;
        } catch (e) {
          setMessageAtom((prev) => ({
            ...prev,
            ...exceptionMessage(),
          }));
        }
      } else {
        // createdAt が null の場合のエラーハンドリング
        console.error("createdAt is null");
      }
    }
  };

  useEffect(() => {
    const get = async () => {
      if (!id) {
        return;
      }

      try {
        const memo = await searchMemoById(id, loginUser);
        if (memo) {
          setTitle(memo.title);
          setContent(memo.content);
          setCreatedAt(memo.createdAt);
          setTags(memo.tags);
        }
      } catch (e) {
        setMessageAtom((prev) => ({
          ...prev,
          ...exceptionMessage(),
        }));
      }
    };

    get();
  }, [id, loginUser, setMessageAtom]);


  return (
    <>
    <Box sx={{ display: "flex" }}>
      <Box sx={{ flex: 1, paddingRight: "16px" }}>
        {/* 左側のフォーム部分 */}
        <Typography variant="h2">{screenTitle}</Typography>
        <Box sx={{ paddingTop: "40px", paddingBottom: "40px" }}>
          <Grid container spacing={2} sx={{ width: "100%" }}>
            {/* 左側のフォーム部分 */}
            <Grid item xs={12}>
              <TextField
                label="Title"
                id="standard-basic"
                variant="standard"
                required
                fullWidth
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                error={titleError}
                helperText={titleError ? "Title is required" : ""}
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>
                Content
              </Typography>
              <ReactQuill //TextFieldからリッチテキストエディタQuillに変更
                className="react-quill-toolbar"
                value={content}
                onChange={setContent}
                modules={{
                  toolbar: [
                    [{ 'header': 1 }, { 'header': 2 }],
                    ['bold', 'strike'],
                    ['blockquote'],
                    [{ 'list': 'ordered'}, { 'list': 'bullet' }, {'list': 'check'}],
                    [{ 'color': [] }, 'clean'],
                    ['link', 'image']
                  ]
                }}
              />
            </Grid>            
            <Grid item xs={12}>
              <ReactTags
                tags={Array.isArray(tags) ? tags : []}
                handleDelete={handleDelete}
                handleAddition={handleAddition}
                handleDrag={handleDrag}
                delimiters={[188, 13]} // カンマとエンターキー
              />
            </Grid>
            {loginUser.apiKey && (
              <Grid item xs={12}>
                {/* タグ生成ボタンの追加 */}
                <Button variant="contained" onClick={() => manuallyGenerateTags()}>
                  Generate Tags
                </Button>
                {isGeneratingTags && <Typography>Generating...</Typography>}
              </Grid>
            )}
            <Grid item xs={12}>
              <Button variant="contained" onClick={() => save()}>
                Save
              </Button>
              <Button
                variant="outlined"
                onClick={() => backToMemoList()}
                sx={{ marginLeft: 2 }}
              >
                Cancel
              </Button>
            </Grid>
          </Grid>
        </Box>
      </Box>
    </Box>
    </>
  );
}