/* eslint-disable @next/next/no-img-element -- Blob images are already compressed and served directly without invoking Vercel Image Optimization. */
'use client';

import {
  Alert,
  Button,
  Description,
  Form,
  Label,
  Modal,
  TextArea,
  TextField,
  Typography,
} from '@heroui/react';
import { Images, Pencil, Save } from 'lucide-react';
import { type FormEvent, useState } from 'react';

import { useAuthorSession, useLocale } from '@/app/providers';
import { MediaAttachmentsField } from '@/components/media/MediaAttachmentsField';
import { MarkdownContent } from '@/components/stats/MarkdownContent';
import type { ProjectConfig } from '@/utils/config';
import { uploadMediaFiles } from '@/utils/media-client';
import { MAX_PROJECT_IMAGES } from '@/utils/media';
import type { ProjectContentData } from '@/utils/project-content';

type ProjectContentSectionProps = {
  project: ProjectConfig;
  initialContent: ProjectContentData;
};

export function ProjectContentSection({
  project,
  initialContent,
}: ProjectContentSectionProps) {
  const { copy, locale } = useLocale();
  const { session } = useAuthorSession();
  const strings = copy.project;
  const [content, setContent] = useState(initialContent);
  const [documentationRu, setDocumentationRu] = useState(
    initialContent.documentation.ru,
  );
  const [documentationEn, setDocumentationEn] = useState(
    initialContent.documentation.en,
  );
  const [existingUrls, setExistingUrls] = useState(initialContent.imageUrls);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [saveError, setSaveError] = useState<string>();
  const [isSaving, setIsSaving] = useState(false);
  const documentation = content.documentation[locale];
  const hasPublicContent =
    Boolean(documentation.trim()) || content.imageUrls.length > 0;

  function resetEditor() {
    setDocumentationRu(content.documentation.ru);
    setDocumentationEn(content.documentation.en);
    setExistingUrls(content.imageUrls);
    setPendingFiles([]);
    setSaveError(undefined);
  }

  async function save(event: FormEvent<HTMLFormElement>, close: () => void) {
    event.preventDefault();
    setIsSaving(true);
    setSaveError(undefined);

    let uploadedUrls: string[] = [];

    try {
      uploadedUrls = await uploadMediaFiles(
        pendingFiles,
        {
          type: 'project',
          projectSlug: project.slug,
        },
        strings.imageOptimizationFailed,
      );
      const imageUrls = [...existingUrls, ...uploadedUrls];
      const response = await fetch(`/api/projects/${project.slug}/content`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentation: {
            ru: documentationRu,
            en: documentationEn,
          },
          imageUrls,
          uploadedImageUrls: uploadedUrls,
        }),
      });
      const body = (await response.json()) as {
        error?: string;
        content?: ProjectContentData;
      };

      if (!response.ok || !body.content) {
        throw new Error(body.error ?? strings.contentSaveFailed);
      }

      setContent(body.content);
      setPendingFiles([]);
      close();
    } catch (caughtError) {
      setSaveError(
        caughtError instanceof Error
          ? caughtError.message
          : strings.contentSaveFailed,
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (!hasPublicContent && !session?.authenticated) {
    return null;
  }

  return (
    <section className="flex flex-col gap-5 border-t pt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Typography.Heading level={2}>
          {strings.projectContent}
        </Typography.Heading>

        {session?.authenticated ? (
          <Modal>
            <Modal.Trigger
              className="button button--secondary button--sm"
              onPress={resetEditor}
            >
              <Pencil className="size-4" />
              {strings.editContent}
            </Modal.Trigger>
            <Modal.Backdrop variant="blur">
              <Modal.Container size="lg" scroll="inside">
                <Modal.Dialog className="max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] sm:max-w-4xl">
                  {({ close }) => (
                    <Form
                      className="flex h-full flex-col"
                      onSubmit={(event) => void save(event, close)}
                    >
                      <Modal.CloseTrigger />
                      <Modal.Header>
                        <Modal.Heading>{strings.editContent}</Modal.Heading>
                      </Modal.Header>
                      <Modal.Body className="flex flex-col gap-5">
                        <TextField
                          fullWidth
                          value={documentationRu}
                          onChange={setDocumentationRu}
                        >
                          <Label>{strings.documentationRu}</Label>
                          <TextArea
                            rows={12}
                            maxLength={50_000}
                            variant="secondary"
                            placeholder={strings.documentationPlaceholder}
                          />
                          <Description>
                            {strings.markdownDocumentationHint}
                          </Description>
                        </TextField>

                        <TextField
                          fullWidth
                          value={documentationEn}
                          onChange={setDocumentationEn}
                        >
                          <Label>{strings.documentationEn}</Label>
                          <TextArea
                            rows={12}
                            maxLength={50_000}
                            variant="secondary"
                            placeholder={strings.documentationPlaceholder}
                          />
                          <Description>
                            {strings.markdownDocumentationHint}
                          </Description>
                        </TextField>

                        <MediaAttachmentsField
                          existingUrls={existingUrls}
                          pendingFiles={pendingFiles}
                          maximum={MAX_PROJECT_IMAGES}
                          label={strings.images}
                          description={strings.projectImagesDescription}
                          addLabel={strings.addImages}
                          removeLabel={strings.removeImage}
                          invalidTypeMessage={strings.invalidImageType}
                          tooLargeMessage={strings.imageTooLarge}
                          limitMessage={strings.imageLimit}
                          onExistingUrlsChange={setExistingUrls}
                          onPendingFilesChange={setPendingFiles}
                        />

                        {saveError ? (
                          <Alert status="danger">
                            <Alert.Indicator />
                            <Alert.Content>
                              <Alert.Title>
                                {strings.contentSaveFailed}
                              </Alert.Title>
                              <Alert.Description>{saveError}</Alert.Description>
                            </Alert.Content>
                          </Alert>
                        ) : null}
                      </Modal.Body>
                      <Modal.Footer>
                        <Button slot="close" type="button" variant="tertiary">
                          {strings.cancel}
                        </Button>
                        <Button type="submit" isPending={isSaving}>
                          <Save />
                          {strings.saveContent}
                        </Button>
                      </Modal.Footer>
                    </Form>
                  )}
                </Modal.Dialog>
              </Modal.Container>
            </Modal.Backdrop>
          </Modal>
        ) : null}
      </div>

      {content.imageUrls.length > 0 ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Images className="size-5" />
            <Typography.Heading level={3}>{strings.images}</Typography.Heading>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {content.imageUrls.map((url, index) => (
              <figure
                key={url}
                className="aspect-video overflow-hidden rounded-xl border bg-default-soft"
              >
                <img
                  src={url}
                  alt={strings.imageAlt
                    .replace('{name}', project.name)
                    .replace('{index}', String(index + 1))}
                  className="size-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
              </figure>
            ))}
          </div>
        </div>
      ) : null}

      {documentation.trim() ? (
        <article className="flex flex-col gap-3">
          <Typography.Heading level={3}>
            {strings.documentation}
          </Typography.Heading>
          <MarkdownContent content={documentation} />
        </article>
      ) : session?.authenticated ? (
        <Typography.Paragraph className="text-sm text-muted">
          {strings.emptyProjectContent}
        </Typography.Paragraph>
      ) : null}
    </section>
  );
}
