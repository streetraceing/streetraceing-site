'use client';

import { useLocale } from '@/app/providers';
import { Avatar, Modal } from '@heroui/react';
import { FaSpotify } from 'react-icons/fa6';
import Tilt from 'react-parallax-tilt';

export function ProfileAvatar() {
  const { copy } = useLocale();

  return (
    <Modal>
      <Modal.Trigger className="h-48 w-48 select-none">
        <Tilt
          tiltMaxAngleX={10}
          tiltMaxAngleY={10}
          tiltReverse
          scale={1.05}
          perspective={750}
        >
          <Avatar className="h-48 w-48 shadow-2xl dark:shadow-muted/25">
            <Avatar.Image
              alt="streetraceing"
              src="/images/streetraceing.jpeg"
            />
            <Avatar.Fallback>ST</Avatar.Fallback>
          </Avatar>
        </Tilt>
      </Modal.Trigger>
      <Modal.Backdrop>
        <Modal.Container>
          <Modal.Dialog>
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Header>
                <Modal.Icon className="bg-default text-foreground">
                  <FaSpotify className="size-5" />
                </Modal.Icon>
                <Modal.Heading>{copy.avatar.title}</Modal.Heading>
              </Modal.Header>
            </Modal.Header>
            <Modal.Body className="flex gap-4 flex-col">
              <p>{copy.avatar.description}</p>
              <div className="overflow-hidden rounded-2xl transform-gpu block border-0">
                <iframe
                  data-testid="embed-iframe"
                  src="https://open.spotify.com/embed/track/4VlFiY2g9ABVueOKPjyezU?utm_source=generator&si=174f48898a574e0e"
                  width="100%"
                  height="352"
                  className="block border-0"
                  style={{ transform: 'translateZ(0)' }}
                  allowFullScreen
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  loading="lazy"
                ></iframe>
              </div>
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
