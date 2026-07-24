'use client';

import {
  Alert,
  AlertDialog,
  Button,
  Card,
  Description,
  FieldError,
  Form,
  Input,
  Label,
  ListBox,
  Modal,
  Select,
  TextArea,
  TextField,
  Typography,
} from '@heroui/react';
import { Eye, EyeOff, Pencil, Save, Trash2 } from 'lucide-react';
import { type FormEvent, useState } from 'react';

import { useLocale } from '@/app/providers';
import { MediaAttachmentsField } from '@/components/media/MediaAttachmentsField';
import { getLocaleTag } from '@/utils/i18n';
import { MAX_DEV_UPDATE_IMAGES } from '@/utils/media';
import { uploadMediaFiles } from '@/utils/media-client';
import {
  devUpdateTopics,
  getDevUpdateTopicLabel,
  type DevUpdateTopic,
} from '@/utils/stats';

import { MarkdownContent } from './MarkdownContent';
import type { DevUpdate, DevUpdateChange } from './types';

type DevUpdateAuthorActionsProps = {
  update: DevUpdate;
  onChanged: (change: DevUpdateChange) => void;
};

export default function DevUpdateAuthorActions({
  update,
  onChanged,
}: DevUpdateAuthorActionsProps) {
  const { copy, locale } = useLocale();
  const strings = copy.stats;
  const [editTitle, setEditTitle] = useState(update.title ?? '');
  const [editContent, setEditContent] = useState(update.content);
  const [editTopic, setEditTopic] = useState<DevUpdateTopic>(update.topic);
  const [existingUrls, setExistingUrls] = useState(update.imageUrls);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [isEditPreviewOpen, setIsEditPreviewOpen] = useState(false);
  const [editError, setEditError] = useState<string>();
  const [isSaving, setIsSaving] = useState(false);
  const [deleteError, setDeleteError] = useState<string>();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  function resetEditor() {
    setEditTitle(update.title ?? '');
    setEditContent(update.content);
    setEditTopic(update.topic);
    setExistingUrls(update.imageUrls);
    setPendingFiles([]);
    setIsEditPreviewOpen(false);
    setEditError(undefined);
  }

  async function saveUpdate(
    event: FormEvent<HTMLFormElement>,
    close: () => void,
  ) {
    event.preventDefault();
    setIsSaving(true);
    setEditError(undefined);

    let uploadedUrls: string[] = [];

    try {
      uploadedUrls = await uploadMediaFiles(pendingFiles, {
        type: 'dev-update',
      });
      const response = await fetch(`/api/dev-updates/${update.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle,
          content: editContent,
          topic: editTopic,
          imageUrls: [...existingUrls, ...uploadedUrls],
          uploadedImageUrls: uploadedUrls,
        }),
      });
      const body = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(body.error ?? strings.errors.update);
      }

      close();
      onChanged('update');
    } catch (caughtError) {
      setEditError(
        caughtError instanceof Error
          ? caughtError.message
          : strings.errors.update,
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteUpdate(close: () => void) {
    setIsDeleting(true);
    setDeleteError(undefined);

    try {
      const response = await fetch(`/api/dev-updates/${update.id}`, {
        method: 'DELETE',
      });
      const body = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(body.error ?? strings.errors.delete);
      }

      close();
      onChanged('delete');
    } catch (caughtError) {
      setDeleteError(
        caughtError instanceof Error
          ? caughtError.message
          : strings.errors.delete,
      );
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="flex shrink-0 gap-1">
      <Button
        type="button"
        aria-label={strings.edit}
        isIconOnly
        size="sm"
        variant="tertiary"
        onPress={() => {
          resetEditor();
          setIsEditOpen(true);
        }}
      >
        <Pencil className="size-4" />
      </Button>
      <Modal>
        <Modal.Backdrop
          isOpen={isEditOpen}
          variant="blur"
          onOpenChange={setIsEditOpen}
        >
          <Modal.Container size="lg" scroll="inside">
            <Modal.Dialog className="max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] sm:max-w-3xl">
              {({ close }) => (
                <Form
                  className="flex h-full flex-col"
                  onSubmit={(event) => void saveUpdate(event, close)}
                >
                  <Modal.CloseTrigger />
                  <Modal.Header>
                    <Modal.Heading className="font-bold text-xl">
                      {strings.editNote}
                    </Modal.Heading>
                  </Modal.Header>
                  <Modal.Body className="flex flex-col gap-4">
                    <TextField
                      fullWidth
                      name="edit-title"
                      value={editTitle}
                      onChange={setEditTitle}
                    >
                      <Label>{strings.noteTitle}</Label>
                      <Input
                        maxLength={160}
                        placeholder={strings.noteTitlePlaceholder}
                        variant="secondary"
                      />
                      <Description>{editTitle.length} / 160</Description>
                    </TextField>

                    <Select
                      fullWidth
                      value={editTopic}
                      variant="secondary"
                      onChange={(value) => {
                        if (typeof value === 'string') {
                          setEditTopic(value as DevUpdateTopic);
                        }
                      }}
                    >
                      <Label>{strings.topic}</Label>
                      <Select.Trigger>
                        <Select.Value />
                        <Select.Indicator />
                      </Select.Trigger>
                      <Select.Popover>
                        <ListBox>
                          {devUpdateTopics.map((topic) => (
                            <ListBox.Item
                              key={topic.value}
                              id={topic.value}
                              textValue={getDevUpdateTopicLabel(
                                topic.value,
                                locale,
                              )}
                            >
                              {getDevUpdateTopicLabel(topic.value, locale)}
                              <ListBox.ItemIndicator />
                            </ListBox.Item>
                          ))}
                        </ListBox>
                      </Select.Popover>
                    </Select>

                    <TextField
                      isRequired
                      fullWidth
                      name="edit-content"
                      value={editContent}
                      onChange={setEditContent}
                      validate={(value) =>
                        value.trim() ? null : strings.noteRequired
                      }
                    >
                      <Label>{strings.note}</Label>
                      <TextArea
                        rows={10}
                        maxLength={8_000}
                        variant="secondary"
                        placeholder={strings.notePlaceholder}
                      />
                      <Description>
                        {strings.markdownHint}{' '}
                        {editContent.length.toLocaleString(
                          getLocaleTag(locale),
                        )}{' '}
                        / 8 000
                      </Description>
                      <FieldError />
                    </TextField>

                    <MediaAttachmentsField
                      existingUrls={existingUrls}
                      pendingFiles={pendingFiles}
                      maximum={MAX_DEV_UPDATE_IMAGES}
                      label={strings.images}
                      description={strings.newsImagesDescription}
                      addLabel={strings.addImages}
                      removeLabel={strings.removeImage}
                      invalidTypeMessage={strings.invalidImageType}
                      tooLargeMessage={strings.imageTooLarge}
                      limitMessage={strings.imageLimit}
                      onExistingUrlsChange={setExistingUrls}
                      onPendingFilesChange={setPendingFiles}
                    />

                    <div className="flex flex-col items-start gap-3">
                      <Button
                        type="button"
                        size="sm"
                        variant="tertiary"
                        onPress={() => setIsEditPreviewOpen((value) => !value)}
                      >
                        {isEditPreviewOpen ? <EyeOff /> : <Eye />}
                        {isEditPreviewOpen
                          ? strings.hidePreview
                          : strings.preview}
                      </Button>

                      {isEditPreviewOpen && (
                        <Card className="w-full" variant="transparent">
                          <Card.Header>
                            <Card.Title>{strings.previewTitle}</Card.Title>
                          </Card.Header>
                          <Card.Content>
                            {editContent.trim() ? (
                              <MarkdownContent content={editContent} />
                            ) : (
                              <Typography.Paragraph
                                className="text-muted"
                                size="sm"
                              >
                                {strings.previewEmpty}
                              </Typography.Paragraph>
                            )}
                          </Card.Content>
                        </Card>
                      )}
                    </div>

                    {editError && (
                      <Alert status="danger">
                        <Alert.Indicator />
                        <Alert.Content>
                          <Alert.Title>{strings.noteNotUpdated}</Alert.Title>
                          <Alert.Description>{editError}</Alert.Description>
                        </Alert.Content>
                      </Alert>
                    )}
                  </Modal.Body>
                  <Modal.Footer>
                    <Button slot="close" type="button" variant="tertiary">
                      {strings.cancel}
                    </Button>
                    <Button type="submit" isPending={isSaving}>
                      <Save />
                      {strings.save}
                    </Button>
                  </Modal.Footer>
                </Form>
              )}
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      <Button
        type="button"
        aria-label={strings.delete}
        isIconOnly
        size="sm"
        variant="danger"
        onPress={() => {
          setDeleteError(undefined);
          setIsDeleteOpen(true);
        }}
      >
        <Trash2 className="size-4" />
      </Button>
      <AlertDialog>
        <AlertDialog.Backdrop
          isOpen={isDeleteOpen}
          variant="blur"
          onOpenChange={setIsDeleteOpen}
        >
          <AlertDialog.Container size="sm">
            <AlertDialog.Dialog>
              {({ close }) => (
                <>
                  <AlertDialog.Header>
                    <AlertDialog.Icon status="danger">
                      <Trash2 className="size-5" />
                    </AlertDialog.Icon>
                    <AlertDialog.Heading>
                      {strings.deleteNote}
                    </AlertDialog.Heading>
                  </AlertDialog.Header>
                  <AlertDialog.Body>
                    <Typography.Paragraph className="text-muted">
                      {strings.deleteNoteDescription}
                    </Typography.Paragraph>
                    {deleteError && (
                      <Alert className="mt-3" status="danger">
                        <Alert.Indicator />
                        <Alert.Content>
                          <Alert.Description>{deleteError}</Alert.Description>
                        </Alert.Content>
                      </Alert>
                    )}
                  </AlertDialog.Body>
                  <AlertDialog.Footer>
                    <Button slot="close" variant="tertiary">
                      {strings.cancel}
                    </Button>
                    <Button
                      isPending={isDeleting}
                      variant="danger"
                      onPress={() => void deleteUpdate(close)}
                    >
                      <Trash2 />
                      {strings.delete}
                    </Button>
                  </AlertDialog.Footer>
                </>
              )}
            </AlertDialog.Dialog>
          </AlertDialog.Container>
        </AlertDialog.Backdrop>
      </AlertDialog>
    </div>
  );
}
