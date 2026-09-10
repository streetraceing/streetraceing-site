'use client';

import { Button } from '@/components/ui/Button';
import {
  Alert,
  Card,
  Description,
  FieldError,
  Form,
  Input,
  Label,
  ListBox,
  Select,
  TextArea,
  TextField,
  Typography,
} from '@heroui/react';
import { Eye, EyeOff, Send } from 'lucide-react';
import { type FormEvent, useRef, useState } from 'react';

import { useLocale } from '@/app/providers';
import { MediaAttachmentsField } from '@/components/media/MediaAttachmentsField';
import { MarkdownFormattingToolbar } from '@/components/stats/MarkdownFormattingToolbar';
import {
  MAX_DEV_UPDATE_CONTENT_LENGTH,
  MAX_DEV_UPDATE_TITLE_LENGTH,
} from '@/utils/dev-update-input';
import { getLocaleTag } from '@/utils/i18n';
import { getJsonError, isJsonObject, readJsonResponse } from '@/utils/json';
import { uploadMediaFiles } from '@/utils/media-client';
import { MAX_DEV_UPDATE_IMAGES } from '@/utils/media';
import {
  devUpdateTopics,
  getDevUpdateTopicLabel,
  type DevUpdateTopic,
} from '@/utils/stats';

import { MarkdownContent } from './MarkdownContent';
import { isDevUpdate, type DevUpdate } from './types';

type StatsAuthorControlsProps = {
  onCreated: (update: DevUpdate) => void;
};

export default function StatsAuthorControls({
  onCreated,
}: StatsAuthorControlsProps) {
  const { copy, locale } = useLocale();
  const strings = copy.stats;
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [topic, setTopic] = useState<DevUpdateTopic>('projects');
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [publishError, setPublishError] = useState<string>();
  const [isPublishing, setIsPublishing] = useState(false);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  async function publish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPublishing(true);
    setPublishError(undefined);

    let uploadedUrls: string[] = [];

    try {
      uploadedUrls = await uploadMediaFiles(
        pendingFiles,
        { type: 'dev-update' },
        copy.api.media.uploadFailed,
      );
      const response = await fetch('/api/dev-updates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          content,
          topic,
          imageUrls: uploadedUrls,
          uploadedImageUrls: uploadedUrls,
        }),
      });
      const body = await readJsonResponse(response);

      if (!response.ok) {
        throw new Error(getJsonError(body) ?? strings.errors.publish);
      }

      if (!isJsonObject(body) || !isDevUpdate(body.update)) {
        throw new Error(strings.errors.publishMissing);
      }

      setTitle('');
      setContent('');
      setPendingFiles([]);
      setIsPreviewOpen(false);
      onCreated(body.update);
    } catch (caughtError) {
      setPublishError(
        caughtError instanceof Error
          ? caughtError.message
          : strings.errors.publish,
      );
    } finally {
      setIsPublishing(false);
    }
  }

  return (
    <Card variant="default" className="dark:bg-default/20">
      <Card.Header>
        <div>
          <Card.Title>{strings.newNote}</Card.Title>
          <Card.Description>{strings.authorFormDescription}</Card.Description>
        </div>
      </Card.Header>
      <Card.Content>
        <Form className="flex flex-col gap-4" onSubmit={publish}>
          <TextField fullWidth name="title" value={title} onChange={setTitle}>
            <Label>{strings.noteTitle}</Label>
            <Input
              maxLength={MAX_DEV_UPDATE_TITLE_LENGTH}
              placeholder={strings.noteTitlePlaceholder}
              variant="secondary"
            />
            <Description>
              {title.length} / {MAX_DEV_UPDATE_TITLE_LENGTH}
            </Description>
          </TextField>

          <Select
            fullWidth
            value={topic}
            variant="secondary"
            onChange={(value) => {
              if (typeof value === 'string') {
                setTopic(value as DevUpdateTopic);
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
                {devUpdateTopics.map((item) => (
                  <ListBox.Item
                    key={item.value}
                    id={item.value}
                    textValue={getDevUpdateTopicLabel(item.value, locale)}
                  >
                    {getDevUpdateTopicLabel(item.value, locale)}
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>

          <div className="flex flex-col gap-2">
            <TextField
              isRequired
              fullWidth
              name="content"
              value={content}
              onChange={setContent}
              validate={(value) => (value.trim() ? null : strings.noteRequired)}
            >
              <Label>{strings.note}</Label>
              <TextArea
                ref={contentRef}
                rows={6}
                variant="secondary"
                maxLength={MAX_DEV_UPDATE_CONTENT_LENGTH}
                placeholder={strings.notePlaceholder}
              />
              <Description>
                {strings.markdownHint}{' '}
                {content.length.toLocaleString(getLocaleTag(locale))} / 8 000
              </Description>
              <FieldError />
            </TextField>
            <MarkdownFormattingToolbar
              value={content}
              onChange={setContent}
              textareaRef={contentRef}
            />
          </div>

          <MediaAttachmentsField
            existingUrls={[]}
            pendingFiles={pendingFiles}
            maximum={MAX_DEV_UPDATE_IMAGES}
            label={strings.images}
            description={strings.newsImagesDescription}
            addLabel={strings.addImages}
            removeLabel={strings.removeImage}
            invalidTypeMessage={strings.invalidImageType}
            tooLargeMessage={strings.imageTooLarge}
            limitMessage={strings.imageLimit}
            onExistingUrlsChange={() => undefined}
            onPendingFilesChange={setPendingFiles}
          />

          <div className="flex flex-col items-start gap-3">
            <Button
              type="button"
              size="sm"
              variant="tertiary"
              onPress={() => setIsPreviewOpen((value) => !value)}
            >
              {isPreviewOpen ? <EyeOff /> : <Eye />}
              {isPreviewOpen ? strings.hidePreview : strings.preview}
            </Button>

            {isPreviewOpen && (
              <Card className="w-full" variant="secondary">
                <Card.Header>
                  <Card.Title className="font-semibold">
                    {strings.previewTitle}
                  </Card.Title>
                </Card.Header>
                <Card.Content>
                  {content.trim() ? (
                    <MarkdownContent content={content} />
                  ) : (
                    <Typography.Paragraph className="text-muted" size="sm">
                      {strings.previewEmpty}
                    </Typography.Paragraph>
                  )}
                </Card.Content>
              </Card>
            )}
          </div>

          <Button className="self-start" type="submit" isPending={isPublishing}>
            <Send />
            {strings.publish}
          </Button>
        </Form>

        {publishError && (
          <Alert className="mt-4" status="danger">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>{strings.noteNotPublished}</Alert.Title>
              <Alert.Description>{publishError}</Alert.Description>
            </Alert.Content>
          </Alert>
        )}
      </Card.Content>
    </Card>
  );
}
