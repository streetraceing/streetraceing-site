'use client';

import { useLocale } from '@/app/providers';
import { Avatar, Modal } from '@heroui/react';
import Link from 'next/link';
import { type KeyboardEvent, useState } from 'react';
import { FaSpotify } from 'react-icons/fa6';
import Tilt from 'react-parallax-tilt';

export function ProfileAvatar() {
  const { copy } = useLocale();
  const [isOpen, setIsOpen] = useState(false);

  function openFromKeyboard(event: KeyboardEvent<HTMLAnchorElement>) {
    if (event.key !== ' ') {
      return;
    }

    event.preventDefault();
    setIsOpen(true);
  }

  return (
    <>
      <Link
        href="/#bio"
        role="button"
        aria-label={copy.avatar.title}
        className="h-48 w-48 select-none"
        onClick={(event) => {
          event.preventDefault();
          setIsOpen(true);
        }}
        onKeyDown={openFromKeyboard}
      >
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
      </Link>

      <Modal>
        <Modal.Backdrop isOpen={isOpen} onOpenChange={setIsOpen}>
          <Modal.Container>
            <Modal.Dialog>
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Icon className="bg-default text-foreground">
                  <FaSpotify className="size-5" />
                </Modal.Icon>
                <Modal.Heading>{copy.avatar.title}</Modal.Heading>
              </Modal.Header>
              <Modal.Body className="flex flex-col gap-4">
                <p>{copy.avatar.description}</p>
                <div className="block transform-gpu overflow-hidden rounded-2xl border-0">
                  <iframe
                    title={copy.avatar.spotifyTitle}
                    data-testid="embed-iframe"
                    src="https://open.spotify.com/embed/track/4VlFiY2g9ABVueOKPjyezU?utm_source=generator&si=174f48898a574e0e"
                    width="100%"
                    height="352"
                    className="block border-0"
                    style={{ transform: 'translateZ(0)' }}
                    allowFullScreen
                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                    loading="lazy"
                  />
                </div>
              </Modal.Body>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </>
  );
}
