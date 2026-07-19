'use client';

import { ArrowUpRight, FolderOpen } from 'lucide-react';
import Link from 'next/link';

import { cn } from '@heroui/react';

import type { ProjectConfig } from '@/utils/config';
import { useLocale } from '@/app/providers';
import { getText } from '@/utils/i18n';

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
        <FolderOpen className="size-4" />
        {copy.project.projectPage}
      </Link>

      {project.links.map((link) => (
        <a
          key={link.url}
          href={link.url}
          target="_blank"
          rel="noreferrer"
          className="button button--primary button--md w-full sm:w-auto"
        >
          <link.icon className="size-4" />
          {getText(link.label, locale)}
          <ArrowUpRight className="size-4" />
        </a>
      ))}

      {project.relatedLinks.map((link) => (
        <a
          key={link.url}
          href={link.url}
          target="_blank"
          rel="noreferrer"
          className="button button--tertiary button--md w-full sm:w-auto"
        >
          <link.icon className="size-4" />
          {getText(link.label, locale)}
        </a>
      ))}

      {project.links.length === 0 && (
        <p className="w-full text-sm text-muted">
          {copy.project.noPublicLinks}
        </p>
      )}
    </div>
  );
}
