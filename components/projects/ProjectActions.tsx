'use client';

import { cn } from '@heroui/react';
import { ArrowUpRight, FolderOpen } from 'lucide-react';
import Link from 'next/link';

import { useLocale } from '@/app/providers';
import { ButtonRipple } from '@/components/ui/Button';
import type { ProjectConfig } from '@/utils/config';
import { getText } from '@/utils/i18n';
import { isExternalHttpHref, normalizeInternalAnchorHref } from '@/utils/links';

type ProjectActionsProps = {
  project: ProjectConfig;
  className?: string;
};

export function ProjectActions({ project, className }: ProjectActionsProps) {
  const { copy, locale } = useLocale();

  return (
    <div
      className={cn(
        'flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap',
        className,
      )}
    >
      <Link
        href={`/project/${project.slug}`}
        className="button button--secondary button--md w-full sm:w-auto"
      >
        <ButtonRipple />
        <FolderOpen className="size-4" />
        {copy.project.projectPage}
      </Link>

      {project.links.map((link) => {
        const href = normalizeInternalAnchorHref(link.url);
        const isExternal = isExternalHttpHref(href);

        return (
          <Link
            key={link.url}
            href={href}
            target={isExternal ? '_blank' : undefined}
            rel={isExternal ? 'noreferrer' : undefined}
            className="button button--primary button--md w-full sm:w-auto"
          >
            <ButtonRipple />
            <link.icon className="size-4" />
            {getText(link.label, locale)}
            <ArrowUpRight className="size-4" />
          </Link>
        );
      })}

      {project.relatedLinks.map((link) => {
        const href = normalizeInternalAnchorHref(link.url);
        const isExternal = isExternalHttpHref(href);

        return (
          <Link
            key={link.url}
            href={href}
            target={isExternal ? '_blank' : undefined}
            rel={isExternal ? 'noreferrer' : undefined}
            className="button button--tertiary button--md w-full sm:w-auto"
          >
            <ButtonRipple />
            <link.icon className="size-4" />
            {getText(link.label, locale)}
          </Link>
        );
      })}

      {project.links.length === 0 && (
        <p className="w-full text-sm text-muted">
          {copy.project.noPublicLinks}
        </p>
      )}
    </div>
  );
}
