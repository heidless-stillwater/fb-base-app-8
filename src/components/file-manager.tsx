"use client";

import React, { useState, useMemo, useRef, ChangeEvent } from "react";
import Image from "next/image";
import {
  Folder,
  File as FileIcon,
  MoreVertical,
  Upload,
  FolderPlus,
  Download,
  Trash2,
  Edit,
  ChevronRight,
  HomeIcon,
  Loader2,
  ImageIcon,
} from "lucide-react";
import { format } from "date-fns";
import {
  collection,
  query,
  where,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import {
  ref as storageRef,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { v4 as uuidv4 } from 'uuid';

import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useUser, useFirestore, useStorage, useCollection, useMemoFirebase } from "@/firebase";

export interface FileSystemNode {
  id: string;
  name: string;
  type: "file" | "folder";
  path: string;
  userId: string;
  size?: number;
  lastModified: Date | Timestamp;
  downloadURL?: string;
  storagePath?: string;
}

export interface FolderNode extends FileSystemNode {
  type: 'folder';
}

export interface FileNode extends FileSystemNode {
  type: 'file';
  fileType: string;
}


function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

type DialogState =
  | { type: "create_folder" }
  | { type: "rename"; node: FileSystemNode }
  | { type: "delete"; node: FileSystemNode }
  | null;

export default function FileManager() {
  const { user } = useUser();
  const firestore = useFirestore();
  const storage = useStorage();

  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [dialogState, setDialogState] = useState<DialogState>(null);
  const [inputValue, setInputValue] = useState("");
  const [uploadingFiles, setUploadingFiles] = useState<
    { id: number; name: string; progress: number }[]
  >([]);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentPathString = useMemo(
    () => (currentPath.length === 0 ? "/" : `/${currentPath.join("/")}`),
    [currentPath]
  );
  
  const foldersQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(
      collection(firestore, `users/${user.uid}/folders`),
      where("path", "==", currentPathString)
    );
  }, [firestore, user, currentPathString]);

  const filesQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(
        collection(firestore, `users/${user.uid}/files`),
        where("path", "==", currentPathString)
    );
  }, [firestore, user, currentPathString]);

  const { data: foldersData, isLoading: foldersLoading } = useCollection<FolderNode>(foldersQuery);
  const { data: filesData, isLoading: filesLoading } = useCollection<FileNode>(filesQuery);

  const currentNodes = useMemo(() => {
    const combined = [
        ...(foldersData || []).map(f => ({ ...f, lastModified: (f.lastModified as any)?.toDate ? (f.lastModified as any).toDate() : new Date() })),
        ...(filesData || []).map(f => ({ ...f, lastModified: (f.lastModified as any)?.toDate ? (f.lastModified as any).toDate() : new Date() }))
    ];

    return combined.sort((a, b) => {
      if (a.type === "folder" && b.type === "file") return -1;
      if (a.type === "file" && b.type === "folder") return 1;
      return a.name.localeCompare(b.name);
    });
  }, [foldersData, filesData]);


  const handleNodeClick = (node: FileSystemNode) => {
    if (node.type === "folder") {
      setCurrentPath([...currentPath, node.name]);
    }
  };

  const handleBreadcrumbClick = (index: number) => {
    setCurrentPath(currentPath.slice(0, index));
  };

  const handleOpenDialog = (state: DialogState) => {
    if (state?.type === "rename") {
      setInputValue(state.node.name);
    } else {
      setInputValue("");
    }
    setDialogState(state);
  };

  const closeDialog = () => {
    setDialogState(null);
    setInputValue("");
  };

  const handleCreateFolder = async () => {
    if (!inputValue.trim() || !user) return;
    
    const newFolder: Omit<FolderNode, 'id' | 'lastModified'> & { lastModified: any } = {
      name: inputValue,
      type: "folder",
      path: currentPathString,
      userId: user.uid,
      lastModified: serverTimestamp(),
    };
    try {
      await addDoc(collection(firestore, `users/${user.uid}/folders`), newFolder);
      toast({
        title: "Success",
        description: `Folder "${inputValue}" created.`,
      });
      closeDialog();
    } catch(e) {
      console.error(e);
      toast({
        title: "Error",
        description: "Could not create folder.",
        variant: "destructive",
      });
    }
  };

  const handleRenameNode = async () => {
    if (dialogState?.type !== "rename" || !user) return;

    const originalNode = dialogState.node;
    const newName = inputValue;

    if (!newName.trim()) return;
    
    const collectionName = originalNode.type === 'folder' ? 'folders' : 'files';
    const docRef = doc(firestore, `users/${user.uid}/${collectionName}`, originalNode.id);

    try {
      await updateDoc(docRef, { name: newName, lastModified: serverTimestamp() });
      // Note: Renaming folders does not yet update paths of children. This is a complex operation.
      toast({
        title: "Success",
        description: `Renamed "${originalNode.name}" to "${newName}".`,
      });
      closeDialog();
    } catch(e) {
        console.error(e);
        toast({
            title: "Error",
            description: "Could not rename item.",
            variant: "destructive",
        });
    }
  };

  const handleDeleteNode = async () => {
    if (dialogState?.type !== "delete" || !user) return;
    const nodeToDelete = dialogState.node;
    
    const collectionName = nodeToDelete.type === 'folder' ? 'folders' : 'files';
    const docRef = doc(firestore, `users/${user.uid}/${collectionName}`, nodeToDelete.id);

    try {
      if (nodeToDelete.type === 'file' && nodeToDelete.storagePath) {
        await deleteObject(storageRef(storage, nodeToDelete.storagePath));
      }
      await deleteDoc(docRef);
      // Note: Deleting folders does not yet delete children. This is a complex operation.
      toast({
        title: "Success",
        description: `Deleted "${nodeToDelete.name}".`,
      });
      closeDialog();
    } catch(e) {
        console.error(e);
        toast({
            title: "Error",
            description: "Could not delete item.",
            variant: "destructive",
        });
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || !user) return;

    Array.from(files).forEach((file) => {
      const uploadId = Date.now() + Math.random();
      const newUploadingFile = { id: uploadId, name: file.name, progress: 0 };
      setUploadingFiles((prev) => [...prev, newUploadingFile]);
      
      const fileId = uuidv4();
      const filePath = `users/${user.uid}/files/${fileId}_${file.name}`;
      const fileStorageRef = storageRef(storage, filePath);
      const uploadTask = uploadBytesResumable(fileStorageRef, file);

      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress =
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadingFiles((prev) =>
            prev.map((f) =>
              f.id === uploadId ? { ...f, progress: progress } : f
            )
          );
        },
        (error) => {
          console.error("Upload failed:", error);
          toast({
            title: "Upload Failed",
            description: `Could not upload ${file.name}.`,
            variant: "destructive",
          });
          setUploadingFiles((prev) => prev.filter((f) => f.id !== uploadId));
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          const fileDoc: Omit<FileNode, 'id' | 'lastModified'> & { lastModified: any } = {
            name: file.name,
            type: "file",
            path: currentPathString,
            userId: user.uid,
            size: file.size,
            fileType: file.type,
            lastModified: serverTimestamp(),
            downloadURL,
            storagePath: filePath,
          };
          try {
            await addDoc(collection(firestore, `users/${user.uid}/files`), fileDoc);
            toast({
              title: "Upload Complete",
              description: `File "${file.name}" has been uploaded.`,
            });
          } catch(e) {
             console.error("Error adding file to firestore:", e);
             toast({
                title: "Upload Failed",
                description: `Could not save ${file.name} metadata.`,
                variant: "destructive",
             });
          } finally {
            setUploadingFiles((prev) => prev.filter((f) => f.id !== uploadId));
          }
        }
      );
    });
    
    if (fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  };

  const handleDownload = async (node: FileNode) => {
    if (!node.downloadURL) {
      toast({
        variant: 'destructive',
        title: 'Download Failed',
        description: `"${node.name}" has no download URL.`,
      });
      return;
    }
  
    try {
      toast({
        title: 'Download Started',
        description: `Downloading "${node.name}".`,
      });
  
      // Fetch the file from the download URL
      const response = await fetch(node.downloadURL);
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.statusText}`);
      }
      const blob = await response.blob();
  
      // Create a temporary link to trigger the download
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = node.name;
  
      // Append to the document, click, and then remove
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  
      // Clean up the object URL
      URL.revokeObjectURL(link.href);
    } catch (error) {
      console.error('Download error:', error);
      toast({
        variant: 'destructive',
        title: 'Download Failed',
        description: `Could not download "${node.name}". See console for details.`,
      });
    }
  };

  const dialogContent = useMemo(() => {
    if (!dialogState) return null;

    if (dialogState.type === "delete") {
      return (
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{dialogState.node.name}"
              {dialogState.node.type === 'folder' && ' and all its contents (feature coming soon)'}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={closeDialog}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteNode} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      );
    }

    const isRename = dialogState.type === 'rename';
    const title = isRename ? `Rename "${dialogState.node.name}"` : 'Create New Folder';

    return (
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <Input
              id="name"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="col-span-3"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  isRename ? handleRenameNode() : handleCreateFolder();
                }
              }}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={closeDialog}>Cancel</Button>
          <Button onClick={isRename ? handleRenameNode : handleCreateFolder}>
            {isRename ? 'Rename' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dialogState, inputValue]);

  const isLoading = foldersLoading || filesLoading;

  return (
    <>
      <Card className="shadow-lg h-full">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-2xl">Cloud Storage</CardTitle>
            <CardDescription>Manage your files and folders.</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => handleOpenDialog({ type: 'create_folder' })}>
              <FolderPlus className="mr-2 h-4 w-4" /> New Folder
            </Button>
            <Button onClick={handleUploadClick} className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Upload className="mr-2 h-4 w-4" /> Upload
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              multiple
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4 overflow-x-auto whitespace-nowrap py-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => handleBreadcrumbClick(0)}
              disabled={currentPath.length === 0}
            >
              <HomeIcon className="h-4 w-4" />
            </Button>
            {currentPath.length > 0 && <ChevronRight className="h-4 w-4" />}
            {currentPath.map((part, index) => (
              <React.Fragment key={index}>
                <Button
                  variant="link"
                  className="p-0 h-auto text-sm"
                  onClick={() => handleBreadcrumbClick(index + 1)}
                  disabled={index === currentPath.length - 1}
                >
                  {part}
                </Button>
                {index < currentPath.length - 1 && (
                  <ChevronRight className="h-4 w-4" />
                )}
              </React.Fragment>
            ))}
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]"></TableHead>
                  <TableHead className="w-[80px]">Thumbnail</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden md:table-cell w-[150px]">
                    Size
                  </TableHead>
                  <TableHead className="hidden sm:table-cell w-[200px]">
                    Last Modified
                  </TableHead>
                  <TableHead className="w-[50px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      <Loader2 className="mx-auto h-8 w-8 animate-spin" />
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading && currentNodes.map((node) => (
                  <TableRow
                    key={node.id}
                    className="cursor-pointer"
                    onClick={() => handleNodeClick(node)}
                  >
                    <TableCell className="text-muted-foreground">
                      {node.type === "folder" ? (
                        <Folder />
                      ) : (
                        <FileIcon />
                      )}
                    </TableCell>
                    <TableCell>
                      {node.type === 'file' && (node as FileNode).fileType.startsWith("image/") && (node as FileNode).downloadURL ? (
                        <Image src={(node as FileNode).downloadURL!} alt={node.name} width={40} height={40} className="rounded-md object-cover" />
                      ) : node.type === 'file' ? (
                        <div className="w-10 h-10 flex items-center justify-center bg-muted rounded-md">
                          <ImageIcon className="w-5 h-5 text-muted-foreground" />
                        </div>
                      ) : <div className="w-10 h-10"></div>}
                    </TableCell>
                    <TableCell className="font-medium">{node.name}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {node.type === "file" && node.size
                        ? formatBytes(node.size)
                        : ""}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">
                      {node.lastModified instanceof Date && format(node.lastModified, "PPp")}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {node.type === "file" && (
                            <DropdownMenuItem
                              onSelect={() => handleDownload(node as FileNode)}
                            >
                              <Download className="mr-2 h-4 w-4" />
                              Download
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onSelect={() => handleOpenDialog({ type: "rename", node })}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onSelect={() => handleOpenDialog({ type: "delete", node })}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {uploadingFiles.map((file) => (
                  <TableRow key={file.id}>
                    <TableCell className="text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin" />
                    </TableCell>
                    <TableCell colSpan={5}>
                      <div className="flex items-center gap-4">
                        <span className="font-medium flex-1 truncate">{file.name}</span>
                        <Progress value={file.progress} className="w-32" />
                        <span className="text-sm text-muted-foreground w-12 text-right">{file.progress.toFixed(0)}%</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                 {!isLoading && currentNodes.length === 0 && uploadingFiles.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                            This folder is empty.
                        </TableCell>
                    </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      <Dialog open={!!dialogState && dialogState.type !== 'delete'} onOpenChange={(isOpen) => !isOpen && closeDialog()}>
        {dialogContent}
      </Dialog>
      <AlertDialog open={!!dialogState && dialogState.type === 'delete'} onOpenChange={(isOpen) => !isOpen && closeDialog()}>
        {dialogContent}
      </AlertDialog>
    </>
  );
}
