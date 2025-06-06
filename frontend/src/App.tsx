import "./App.css";

import CssBaseline from "@mui/material/CssBaseline";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { useEffect, useState } from "react";
import CompanyTable from "./components/CompanyTable";
import LikedCompaniesTable from "./components/LikedCompaniesTable";
import IgnoreCompaniesTable from "./components/IgnoreCompaniesTable";
import { getCollectionsMetadata } from "./utils/jam-api";
import useApi from "./utils/useApi";

const darkTheme = createTheme({
  palette: {
    mode: "dark",
  },
});

function App() {
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>();
  const { data: collectionResponse } = useApi(() => getCollectionsMetadata());
  const [isLikedList, setIsLikedList] = useState(false);
  const [isIgnoreList, setIsIgnoreList] = useState(false);

  useEffect(() => {
    setSelectedCollectionId(collectionResponse?.[0]?.id);
  }, [collectionResponse]);

  useEffect(() => {
    if (selectedCollectionId) {
      window.history.pushState({}, "", `?collection=${selectedCollectionId}`);
      // Check if we're in the Liked Companies List or Companies to Ignore List
      const likedList = collectionResponse?.find(c => c.collection_name === "Liked Companies List");
      const ignoreList = collectionResponse?.find(c => c.collection_name === "Companies to Ignore List");
      setIsLikedList(likedList?.id === selectedCollectionId);
      setIsIgnoreList(ignoreList?.id === selectedCollectionId);
    }
  }, [selectedCollectionId, collectionResponse]);

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <div className="mx-8">
        <div className="font-bold text-xl border-b p-2 mb-4 text-left">
          Harmonic Jam
        </div>
        <div className="flex">
          <div className="w-1/5">
            <p className="font-bold border-b mb-2 pb-2 text-left">
              Collections
            </p>
            <div className="flex flex-col gap-2 text-left">
              {collectionResponse?.map((collection) => {
                return (
                  <div
                    key={collection.id}
                    className={`py-1 pl-4 hover:cursor-pointer hover:bg-orange-300 ${
                      selectedCollectionId === collection.id &&
                      "bg-orange-500 font-bold"
                    }`}
                    onClick={() => {
                      setSelectedCollectionId(collection.id);
                    }}
                  >
                    {collection.collection_name}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="w-4/5 ml-4">
            {selectedCollectionId && collectionResponse && (
              isLikedList ? (
                <LikedCompaniesTable 
                  selectedCollectionId={selectedCollectionId} 
                  collections={collectionResponse}
                />
              ) : isIgnoreList ? (
                <IgnoreCompaniesTable
                  selectedCollectionId={selectedCollectionId}
                  collections={collectionResponse}
                />
              ) : (
                <CompanyTable 
                  selectedCollectionId={selectedCollectionId} 
                  collections={collectionResponse}
                />
              )
            )}
          </div>
        </div>
      </div>
    </ThemeProvider>
  );
}

export default App;
