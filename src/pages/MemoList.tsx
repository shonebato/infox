import {
  Box,
  Button,
  Grid,
  IconButton,
  ListItem,
  ListItemText,
  Typography,
  TextField,
  Select,
  MenuItem,
  SelectChangeEvent,
  Switch,
  FormControlLabel
} from "@mui/material";
import SearchIcon from '@mui/icons-material/Search';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import { Delete } from "@mui/icons-material";
import { useState, useEffect, useCallback } from "react";
import { searchMemo } from "../services/searchMemo";
import { Memo } from "../services/memoType";
import { useRecoilState, useSetRecoilState } from "recoil";
import { userAtom } from "../states/userAtom";
import { useNavigate } from "react-router-dom";
import { deleteMemo } from "../services/deleteMemo";
import { messageAtom } from "../states/messageAtom";
import { SimpleDialog } from "../components/SimpleDialog";
import { exceptionMessage, successMessage } from "../utils/messages";
import infoxLogoset from "/infox_logo_typo.svg";



export function MemoList(): JSX.Element {
  const [loginUser] = useRecoilState(userAtom);
  const setMessageAtom = useSetRecoilState(messageAtom);
  const [memoList, setMemoList] = useState<Memo[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedMemoId, setSelectedMemoId] = useState<string | undefined>();
  const navigate = useNavigate();
  const [updateOrder, setUpdateOrder] = useState<Memo[]>([]);
  const [orderBy, setOrderBy] = useState("update");
  const [reverseOrder, setReverseOrder] = useState(false); // 逆順フラグ
  const [searchKeyword, setSearchKeyword] = useState<string>("");
  const [originalMemoList, setOriginalMemoList] = useState<Memo[]>([]);
  const [showNoResults, setShowNoResults] = useState(false); 
  const [showResults,setShowResults] = useState(false);

  const moveToMemo = (id?: string) => {
    if (id) {
      navigate(`/memo/${id}`);
    } else {
      navigate(`/memo`);
    }
  };

  const getMemoList = useCallback(async () => {
    try {
      const _memoList = await searchMemo(loginUser);
      if (_memoList) {
        setMemoList(_memoList);
        setUpdateOrder([..._memoList]); // Save update order
        setOriginalMemoList([..._memoList]);
      }
    } catch (e) {
      setMessageAtom((prev) => ({
        ...prev,
        ...exceptionMessage(),
      }));
    }
  }, [loginUser, setMessageAtom]);

  const onClickDelete = async (id?: string) => {
    if (!id) {
      return;
    }

    try {
      await deleteMemo(id, loginUser);
      setMessageAtom((prev) => ({
        ...prev,
        ...successMessage("Deleted"),
      }));
      setMemoList((prev) => prev.filter((memo) => memo.id !== id));
      setUpdateOrder((prev) => prev.filter((memo) => memo.id !== id));
    } catch (e) {
      setMessageAtom((prev) => ({
        ...prev,
        ...exceptionMessage(),
      }));
    }
  };

  useEffect(() => {
    getMemoList();
  }, [loginUser, getMemoList]);

  const handleSortChange = (event: SelectChangeEvent<string>) => {
    const selectedOrder = event.target.value as string;
    setOrderBy(selectedOrder);
    let sortedList = [...memoList];
    if (selectedOrder === "title") {
      sortedList = [...memoList].sort((a, b) => a.title.localeCompare(b.title));
    }
    if (selectedOrder === "date") {
      sortedList = [...memoList].sort((a, b) => {
        // 型アサーションを使用して Timestamp の seconds にアクセス
        const secondsA = (a.createdAt as any).seconds;
        const secondsB = (b.createdAt as any).seconds;
        return secondsA - secondsB;
      });
    }
    if (reverseOrder) {
      sortedList.reverse(); // 逆順にする
    }
    setMemoList(selectedOrder === "update" ? updateOrder : sortedList);
  };

  const handleNewMemo = () => {
    moveToMemo();
  };

  const handleReverseToggle = () => {
    setReverseOrder(!reverseOrder);
    setMemoList((prevList) => [...prevList].reverse());
  };

  const NoResultsMessage = () => (
    <Typography variant="body1" sx={{ textAlign: 'center', marginTop: '20px' }}>
      No memos found. Try refining your search keywords.
    </Typography>
  );
  const searchMemos = (keyword: string) => {
    if (keyword.trim() === "") {
      // 検索キーワードが空の場合はデフォルトのメモリストを表示
      setMemoList([...updateOrder]);
      setMemoList([...originalMemoList]);
      setShowNoResults(false); // 検索キーワードが空の場合はメッセージを非表示にする
      setShowResults(false);
    } else {
      const filteredMemos = originalMemoList.filter(
        (memo) =>
          memo.title.toLowerCase().includes(keyword.toLowerCase()) ||
          memo.content.toLowerCase().includes(keyword.toLowerCase())||
          memo.tags.some(tag => tag.text.toLowerCase().includes(keyword.toLowerCase()))
      );
      setMemoList([...filteredMemos]);
      setShowResults(filteredMemos.length !== 0);
      setShowNoResults(filteredMemos.length === 0); // ヒット数が0件の場合にメッセージを表示
    }
  };

  const handleSearch = () => {
    searchMemos(searchKeyword);
  };

  const handleSearchInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchKeyword(event.target.value);
  };

  return (
    <>
      <Grid container spacing={2} alignItems="center">
        <Grid container item xs={6}>
          <img src={infoxLogoset} />
        </Grid>
        <Grid container item xs={6}></Grid>
      </Grid>
      <Box
        sx={{
          paddingTop: "40px",
          paddingBottom: "40px",
        }}
      >

      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        marginBottom="20px"
      >
      <Box sx={{ display: "flex", alignItems: "center" }}>
        <Typography variant="body1" sx={{ marginRight: "10px" }}>
          Sort by:
        </Typography>
        <Select value={orderBy} onChange={handleSortChange} sx={{ minWidth: '110px' }}>
          <MenuItem value="update">Update</MenuItem>
          <MenuItem value="title">Title</MenuItem>
          <MenuItem value="date">Date</MenuItem>
          {/* ここに他の並び替えオプションを追加 */}
        </Select>
        <FormControlLabel
          control={<Switch checked={reverseOrder} onChange={handleReverseToggle} />}
          label="Reverse"
          labelPlacement="start"
        />
      </Box>

        <Box sx={{ display: "flex", alignItems: "center" }}>
          <TextField
            label="Search memos"
            value={searchKeyword}
            onChange={handleSearchInputChange}
          />
          <Button variant="contained" onClick={handleSearch}>
            <SearchIcon/>
          </Button>
        </Box>

          <Button variant="contained" onClick={handleNewMemo}>
            <AddCircleIcon/>New memo
          </Button>
        </Box>
        {memoList.length === 0 && showNoResults && <NoResultsMessage />}
        {searchKeyword &&showResults &&memoList.length > 0  && (
  <Typography variant="body1" sx={{ textAlign: 'center', marginTop: '20px' }}>
    {`Found ${memoList.length} memo(s)`}
  </Typography>
)}
        {memoList.map((memo) => {

            //console.log(typeof memo.createdAt, memo.createdAt);// ここで createdAt の値をコンソールに出力
            const createdTimestamp = memo.createdAt as any;
            const updatedTimestamp = memo.updatedAt as any;
            const createdAtDate = new Date(createdTimestamp.seconds * 1000);
            const updatedAtDate = new Date(updatedTimestamp.seconds * 1000);
            const createdFormattedDateTime = createdAtDate.toLocaleString();
            const updatedFormattedDateTime = updatedAtDate.toLocaleString();
            const truncateText = (text:string, maxLength:number) => {
              return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
            };

            return (
          <ListItem
            key={memo.id}
            sx={{ cursor: "pointer" }}
            secondaryAction={
              <IconButton
                aria-label="delete"
                onClick={() => {
                  setSelectedMemoId(memo.id);
                  setOpenDialog(true);
                }}
              >
                <Delete />
              </IconButton>
            }
          >
            <ListItemText
              primary={
                <>
                  <span>{memo.title}</span>
                  <span style={{ marginLeft: '10px', color: 'gray', fontSize: '0.8em' }}>
                    {orderBy === "date" ? (
                      `(Created at: ${createdFormattedDateTime})`
                    ) : (
                      `(Updated at: ${updatedFormattedDateTime})`
                    )}
                  </span>
                  <span style={{ marginLeft: '10px', color: 'gray', fontSize: '0.8em' }}>
                  {memo.tags && memo.tags.length > 0 
                    ? "#" + memo.tags.map(tag => tag.text).join(', ')
                    : ''}
                  </span>
                </>
              }
              secondary={
                <>
                  <span style={{
                    wordWrap: 'break-word',
                    width: '80%',
                    display: 'inline-block' // インライン要素でも幅を適用させる
                  }}>
                    {truncateText(memo.content, 100)}
                  </span>
                </>
              }
              onClick={() => moveToMemo(memo.id)}
            />
          </ListItem>
        );})}
      </Box>
      <SimpleDialog
        open={openDialog}
        handleClose={() => setOpenDialog(false)}
        title="Confirmation"
        content="Are you sure you want to permanently delete this?"
        actions={[
          {
            text: "Delete",
            onClick: () => {
              onClickDelete(selectedMemoId);
              setOpenDialog(false);
            },
          },
          {
            text: "Cancel",
            onClick: () => {
              setOpenDialog(false);
            },
            autoFocus: true,
          },
        ]}
      />
    </>
  );
}
