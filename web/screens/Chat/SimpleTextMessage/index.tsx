/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useContext, useEffect, useState } from 'react'

import { ChatCompletionRole, MessageStatus, ThreadMessage } from '@janhq/core'

import hljs from 'highlight.js'

import { useAtomValue } from 'jotai'
import { Marked } from 'marked'

import { markedHighlight } from 'marked-highlight'

import { twMerge } from 'tailwind-merge'

import LogoMark from '@/containers/Brand/Logo/Mark'

import BubbleLoader from '@/containers/Loader/Bubble'

import { displayDate } from '@/utils/datetime'

import MessageToolbar from '../MessageToolbar'

import { getCurrentChatMessagesAtom } from '@/helpers/atoms/ChatMessage.atom'

const marked = new Marked(
  markedHighlight({
    langPrefix: 'hljs',
    highlight(code, lang) {
      if (lang === undefined || lang === '') {
        return hljs.highlightAuto(code).value
      }
      return hljs.highlight(code, { language: lang }).value
    },
  }),
  {
    renderer: {
      code(code, lang, escaped) {
        // Make a copy paste
        return `
        <pre class="hljs">
          <code class="language-${encodeURIComponent(lang ?? '')}">${
            escaped ? code : encodeURIComponent(code)
          }</code>
          </pre>`
      },
    },
  }
)

const SimpleTextMessage: React.FC<ThreadMessage> = (props) => {
  let text = ''
  if (props.content && props.content.length > 0) {
    text = props.content[0]?.text?.value ?? ''
  }

  const parsedText = marked.parse(text)
  const isUser = props.role === ChatCompletionRole.User
  const isSystem = props.role === ChatCompletionRole.System
  const [tokenCount, setTokenCount] = useState(0)

  const [lastTimestamp, setLastTimestamp] = useState<number | undefined>()
  const [tokenSpeed, setTokenSpeed] = useState(0)
  const messages = useAtomValue(getCurrentChatMessagesAtom)

  useEffect(() => {
    if (props.status === MessageStatus.Ready) {
      return
    }
    const currentTimestamp = new Date().getTime() // Get current time in milliseconds
    if (!lastTimestamp) {
      // If this is the first update, just set the lastTimestamp and return
      if (props.content[0]?.text?.value !== '')
        setLastTimestamp(currentTimestamp)
      return
    }

    const timeDiffInSeconds = (currentTimestamp - lastTimestamp) / 1000 // Time difference in seconds
    const totalTokenCount = tokenCount + 1
    const averageTokenSpeed = totalTokenCount / timeDiffInSeconds // Calculate average token speed

    setTokenSpeed(averageTokenSpeed)
    setTokenCount(totalTokenCount)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.content])

  return (
    <div className="group relative mx-auto rounded-xl px-4 lg:w-3/4">
      <div
        className={twMerge(
          'mb-2 flex items-center justify-start gap-x-2',
          !isUser && 'mt-2'
        )}
      >
        {!isUser && !isSystem && <LogoMark width={20} />}
        <div className="text-sm font-extrabold capitalize">{props.role}</div>
        <p className="text-xs font-medium">{displayDate(props.created)}</p>
        <div
          className={twMerge(
            'absolute right-0 cursor-pointer transition-all',
            messages[messages.length - 1]?.id === props.id
              ? 'absolute -bottom-10 left-4'
              : 'hidden group-hover:flex'
          )}
        >
          <MessageToolbar message={props} />
        </div>
      </div>

      <div className={twMerge('w-full')}>
        {props.status === MessageStatus.Pending &&
        (!props.content[0] || props.content[0].text.value === '') ? (
          <BubbleLoader />
        ) : (
          <>
            <div
              className={twMerge(
                'message flex flex-grow flex-col gap-y-2 text-[15px] font-normal leading-relaxed',
                isUser && 'whitespace-pre-wrap break-words'
              )}
              // eslint-disable-next-line @typescript-eslint/naming-convention
              dangerouslySetInnerHTML={{ __html: parsedText }}
            />
          </>
        )}
      </div>
      {(props.status === MessageStatus.Pending || tokenSpeed > 0) && (
        <p className="mt-2 text-xs font-medium text-foreground">
          Token Speed: {Number(tokenSpeed).toFixed(2)}/s
        </p>
      )}
    </div>
  )
}

export default React.memo(SimpleTextMessage)
