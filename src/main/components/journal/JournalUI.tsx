import cn from "clsx";
import React, { useLayoutEffect, useState } from "react";
import { GridList } from "react-aria-components";
import { FormattedMessage, useIntl } from "react-intl";
import { useStore } from "zustand";
import { useEventCallback } from "../../hooks/event-callback";
import { Journal, JournalEntryHandle } from "../../model/journal";
import { Workspace } from "../../model/workspace";
import { JournalItem } from "./JournalItem";
import { JournalToolbar } from "./JournalToolbar";
import { AppDialog } from "../Dialog";
import { AppButton } from "../AppButton";

interface JournalUIProps {
  className?: string;
  journal: Journal;
  workspace: Workspace;
  loadJournal?: (handle: JournalEntryHandle) => void;
}

export const JournalUI: React.FC<JournalUIProps> = (props) => {
  const { className, journal, workspace, loadJournal } = props;
  const intl = useIntl();

  const sessionJournal = useStore(journal, (j) => j.sessionJournal);
  const namedJournal = useStore(journal, (j) => j.namedJournal);

  const handleOnAction = useEventCallback((key: React.Key) => {
    let handle: JournalEntryHandle | undefined;

    if (typeof key === "string") {
      const [type, id] = key.split(":");
      const journal = type === "session" ? sessionJournal : namedJournal;
      handle = journal.find((h) => h.id === id);
    }

    if (handle != null) {
      loadJournal?.(handle);
    }
  });

  const [entryToBeDelete, setEntryToBeDelete] =
    useState<JournalEntryHandle | null>(null);

  const handleOnDelete = useEventCallback((handle: JournalEntryHandle) => {
    setEntryToBeDelete(handle);
  });

  const handleDeleteDialogOnClose = useEventCallback(() => {
    setEntryToBeDelete(null);
  });

  return (
    <div className={cn("flex flex-col", className)}>
      <JournalToolbar
        className="flex-none mb-4"
        journal={journal}
        workspace={workspace}
      />
      <div className="flex-shrink pb-16 overflow-auto">
        <GridList
          aria-label={intl.formatMessage({
            id: "views.journal.title",
            defaultMessage: "Journal",
          })}
          onAction={handleOnAction}
        >
          {sessionJournal
            .slice()
            .reverse()
            .map((handle, i) => (
              <JournalItem
                key={handle.id}
                handle={handle}
                ordinal={i + 1}
                onDelete={handleOnDelete}
              />
            ))}
          {namedJournal.map((handle, i) => (
            <JournalItem
              key={handle.id}
              handle={handle}
              ordinal={i + 1}
              onDelete={handleOnDelete}
            />
          ))}
        </GridList>
      </div>
      <DeleteDialog
        journal={journal}
        handle={entryToBeDelete}
        onClose={handleDeleteDialogOnClose}
      />
    </div>
  );
};

interface DeleteDialogProps {
  journal: Journal;
  handle: JournalEntryHandle | null;
  onClose: () => void;
}

const DeleteDialog: React.FC<DeleteDialogProps> = (props) => {
  const { journal, handle, onClose } = props;
  const intl = useIntl();

  const [displaySaveName, setDisplaySaveName] = useState(handle?.id);
  useLayoutEffect(() => {
    if (handle != null) {
      switch (handle.type) {
        case "session":
          setDisplaySaveName(
            intl.formatMessage(
              {
                id: "views.journal.deleteSave.autosave",
                defaultMessage: "Autosave ({id})",
              },
              { id: handle.id },
            ),
          );
          break;
        case "named":
          setDisplaySaveName(handle.id);
          break;
      }
    }
  }, [handle, intl]);

  const handleOnOpenChange = useEventCallback((isOpen: boolean) => {
    if (!isOpen) {
      onClose();
    }
  });
  const handleKeepOnClick = useEventCallback(() => {
    onClose();
  });

  const handleDeleteOnClick = useEventCallback(() => {
    if (handle != null) {
      journal.getState().delete(handle);
    }
    onClose();
  });

  return (
    <AppDialog.ModalOverlay
      isOpen={handle != null}
      isDismissable={true}
      onOpenChange={handleOnOpenChange}
    >
      <AppDialog.Modal>
        <AppDialog>
          <AppDialog.Heading>
            <FormattedMessage
              id="views.journal.deleteSave.title"
              defaultMessage="Delete {saveName}"
              values={{ saveName: displaySaveName }}
            />
          </AppDialog.Heading>
          <AppDialog.Actions>
            <AppButton
              variant="destructive"
              className="flex-none"
              onPress={handleDeleteOnClick}
            >
              <FormattedMessage
                id="views.journal.deleteSave.confirm"
                defaultMessage="Delete"
              />
            </AppButton>
            <AppButton
              variant="secondary"
              className="flex-none"
              autoFocus
              onPress={handleKeepOnClick}
            >
              <FormattedMessage
                id="views.journal.deleteSave.cancel"
                defaultMessage="Keep"
              />
            </AppButton>
          </AppDialog.Actions>
        </AppDialog>
      </AppDialog.Modal>
    </AppDialog.ModalOverlay>
  );
};
