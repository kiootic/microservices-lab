import cn from "clsx";
import React, { useLayoutEffect, useMemo, useState } from "react";
import { GridList, Item } from "react-aria-components";
import { FormattedMessage, useIntl } from "react-intl";
import { useStore } from "zustand";
import { useEventCallback } from "../../hooks/event-callback";
import { Journal, JournalEntryHandle } from "../../model/journal";
import { Workspace } from "../../model/workspace";
import { AppButton } from "../AppButton";
import { AppDialog } from "../Dialog";
import { JournalItem } from "./JournalItem";
import { JournalToolbar } from "./JournalToolbar";
import "../../model/scenarios";
import { Scenario, scenarios } from "../../model/scenarios";
import { ScenarioItem } from "./ScenarioItem";

interface JournalUIProps {
  className?: string;
  journal: Journal;
  workspace: Workspace;
  loadJournal?: (handle: JournalEntryHandle) => void;
  loadScenario?: (scenario: Scenario) => void;
}

export const JournalUI: React.FC<JournalUIProps> = (props) => {
  const { className, journal, workspace, loadJournal, loadScenario } = props;
  const intl = useIntl();

  const sessionJournal = useStore(journal, (j) => j.sessionJournal);
  const namedJournal = useStore(journal, (j) => j.namedJournal);

  const handleOnAction = useEventCallback((key: React.Key) => {
    if (typeof key !== "string") {
      return;
    }

    const [type, id] = key.split(":");
    switch (type) {
      case "session": {
        const handle = sessionJournal.find((h) => h.id === id);
        if (handle != null) {
          loadJournal?.(handle);
        }
        break;
      }
      case "named": {
        const handle = namedJournal.find((h) => h.id === id);
        if (handle != null) {
          loadJournal?.(handle);
        }
        break;
      }
      case "scenario": {
        const scenario = scenarios.find((s) => s.key === id);
        if (scenario != null) {
          loadScenario?.(scenario);
        }
        break;
      }
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

  const disabledKeys = useMemo(
    () => ["saves-header", "separator", "scenario-header"],
    [],
  );

  return (
    <div className={cn("flex flex-col", className)}>
      <JournalToolbar
        className="flex-none"
        journal={journal}
        workspace={workspace}
      />
      <div className="flex-shrink pb-16 overflow-auto">
        <GridList
          aria-label={intl.formatMessage({
            id: "views.journal.title",
            defaultMessage: "Journal",
          })}
          disabledKeys={disabledKeys}
          onAction={handleOnAction}
        >
          {sessionJournal.length > 0 || namedJournal.length > 0 ? (
            <Item
              id="saves-header"
              className="px-2.5 py-3 text-sm tracking-wide font-medium text-gray-500 uppercase"
            >
              {intl.formatMessage({
                id: "views.journal.section.saves",
                defaultMessage: "Saves",
              })}
            </Item>
          ) : null}

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

          {sessionJournal.length > 0 && namedJournal.length > 0 ? (
            <Item id="separator" textValue=" " className="my-2 mx-4 border-t" />
          ) : null}

          {namedJournal.map((handle, i) => (
            <JournalItem
              key={handle.id}
              handle={handle}
              ordinal={i + 1}
              onDelete={handleOnDelete}
            />
          ))}

          <Item
            id="scenario-header"
            className={cn(
              "px-2.5 py-3 text-sm tracking-wide font-medium text-gray-500 uppercase",
              (sessionJournal.length > 0 || namedJournal.length > 0) &&
                "mt-2 border-t-8 border-gray-100",
            )}
          >
            {intl.formatMessage({
              id: "views.journal.section.scenarios",
              defaultMessage: "Scenarios",
            })}
          </Item>

          {scenarios.map((scenario) => (
            <ScenarioItem key={scenario.key} scenario={scenario} />
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
