'use client';

import { Button } from '@/components/ui/Button';
import { Alert, Form, Modal, Typography } from '@heroui/react';
import { Images, Pencil, Save } from 'lucide-react';
import dynamic from 'next/dynamic';
import { type FormEvent, useState } from 'react';

import { useAuthorSession, useLocale } from '@/app/providers';
import { MediaGallery } from '@/components/media/MediaGallery';
import type { ProjectConfig } from '@/utils/config';
import { uploadMediaFiles } from '@/utils/media-client';
import { MAX_PROJECT_IMAGES } from '@/utils/media';
import type { ProjectContentData } from '@/utils/project-content';

const MediaAttachmentsField = dynamic(() =>
  import('@/components/media/MediaAttachmentsField').then(
    (module) => module.MediaAttachmentsField,
  ),
);

type ProjectContentSectionProps = {
  project: ProjectConfig;
  initialContent: ProjectContentData;
};

export function ProjectContentSection({
  project,
  initialContent,
}: ProjectContentSectionProps) {
  const { copy } = useLocale();
  const { session } = useAuthorSession();
  const strings = copy.project;
  const [content, setContent] = useState(initialContent);
  const [existingUrls, setExistingUrls] = useState(initialContent.imageUrls);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [saveError, setSaveError] = useState<string>();
  const [isSaving, setIsSaving] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const hasPublicContent = content.imageUrls.length > 0;

  function resetEditor() {
    setExistingUrls(content.imageUrls);
    setPendingFiles([]);
    setSaveError(undefined);
  }

  function openEditor() {
    resetEditor();
    setIsEditorOpen(true);
  }

  async function save(event: FormEvent<HTMLFormElement>, close: () => void) {
    event.preventDefault();
    setIsSaving(true);
    setSaveError(undefined);

    let uploadedUrls: string[] = [];

    try {
      uploadedUrls = await uploadMediaFiles(pendingFiles, {
        type: 'project',
        projectSlug: project.slug,
      });
      const imageUrls = [...existingUrls, ...uploadedUrls];
      const response = await fetch(`/api/projects/${project.slug}/content`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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
          <>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onPress={openEditor}
            >
              <Pencil className="size-4" />
              {strings.editContent}
            </Button>
            <Modal>
              <Modal.Backdrop
                isOpen={isEditorOpen}
                variant="blur"
                onOpenChange={setIsEditorOpen}
              >
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
                                <Alert.Description>
                                  {saveError}
                                </Alert.Description>
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
          </>
        ) : null}
      </div>

      {content.imageUrls.length > 0 ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Images className="size-5" />
            <Typography.Heading level={3}>{strings.images}</Typography.Heading>
          </div>
          <MediaGallery
            urls={content.imageUrls}
            getAlt={(index) =>
              strings.imageAlt
                .replace('{name}', project.name)
                .replace('{index}', String(index + 1))
            }
          />
        </div>
      ) : null}
    </section>
  );
}
