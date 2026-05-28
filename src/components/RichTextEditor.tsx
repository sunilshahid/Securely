import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import { 
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, 
  Heading1, Heading2, List, ListOrdered, Quote, 
  Code, Code2, Link as LinkIcon, ImageIcon, AlignLeft, 
  AlignCenter, AlignRight, AlignJustify 
} from 'lucide-react';

const MenuBar = ({ editor }: { editor: any }) => {
  if (!editor) {
    return null;
  }

  const addImage = () => {
    const url = window.prompt('URL');
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  const setLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);
    
    // cancelled
    if (url === null) {
      return;
    }

    // empty
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    // update link
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  return (
    <div className="bg-neutral-900 border-b border-neutral-700/50 p-2 flex flex-wrap items-center gap-1">
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={`p-1.5 rounded transition ${editor.isActive('bold') ? 'bg-neutral-700 text-white' : 'text-neutral-400 hover:text-white hover:bg-neutral-800'}`}
        title="Bold"
      >
        <Bold className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={`p-1.5 rounded transition ${editor.isActive('italic') ? 'bg-neutral-700 text-white' : 'text-neutral-400 hover:text-white hover:bg-neutral-800'}`}
        title="Italic"
      >
        <Italic className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className={`p-1.5 rounded transition ${editor.isActive('underline') ? 'bg-neutral-700 text-white' : 'text-neutral-400 hover:text-white hover:bg-neutral-800'}`}
        title="Underline"
      >
        <UnderlineIcon className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleStrike().run()}
        className={`p-1.5 rounded transition ${editor.isActive('strike') ? 'bg-neutral-700 text-white' : 'text-neutral-400 hover:text-white hover:bg-neutral-800'}`}
        title="Strikethrough"
      >
        <Strikethrough className="w-4 h-4" />
      </button>
      
      <span className="w-px h-4 bg-neutral-700 mx-1"></span>

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={`p-1.5 rounded transition ${editor.isActive('heading', { level: 1 }) ? 'bg-neutral-700 text-white' : 'text-neutral-400 hover:text-white hover:bg-neutral-800'}`}
        title="Heading 1"
      >
        <Heading1 className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={`p-1.5 rounded transition ${editor.isActive('heading', { level: 2 }) ? 'bg-neutral-700 text-white' : 'text-neutral-400 hover:text-white hover:bg-neutral-800'}`}
        title="Heading 2"
      >
        <Heading2 className="w-4 h-4" />
      </button>
      
      <span className="w-px h-4 bg-neutral-700 mx-1"></span>

      <button
        type="button"
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
        className={`p-1.5 rounded transition ${editor.isActive({ textAlign: 'left' }) ? 'bg-neutral-700 text-white' : 'text-neutral-400 hover:text-white hover:bg-neutral-800'}`}
        title="Align Left"
      >
        <AlignLeft className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
        className={`p-1.5 rounded transition ${editor.isActive({ textAlign: 'center' }) ? 'bg-neutral-700 text-white' : 'text-neutral-400 hover:text-white hover:bg-neutral-800'}`}
        title="Align Center"
      >
        <AlignCenter className="w-4 h-4" />
      </button>
      
      <span className="w-px h-4 bg-neutral-700 mx-1"></span>

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`p-1.5 rounded transition ${editor.isActive('bulletList') ? 'bg-neutral-700 text-white' : 'text-neutral-400 hover:text-white hover:bg-neutral-800'}`}
        title="Bullet List"
      >
        <List className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={`p-1.5 rounded transition ${editor.isActive('orderedList') ? 'bg-neutral-700 text-white' : 'text-neutral-400 hover:text-white hover:bg-neutral-800'}`}
        title="Ordered List"
      >
        <ListOrdered className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={`p-1.5 rounded transition ${editor.isActive('blockquote') ? 'bg-neutral-700 text-white' : 'text-neutral-400 hover:text-white hover:bg-neutral-800'}`}
        title="Blockquote"
      >
        <Quote className="w-4 h-4" />
      </button>
      
      <span className="w-px h-4 bg-neutral-700 mx-1"></span>

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleCode().run()}
        className={`p-1.5 rounded transition ${editor.isActive('code') ? 'bg-neutral-700 text-white' : 'text-neutral-400 hover:text-white hover:bg-neutral-800'}`}
        title="Code"
      >
        <Code className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        className={`p-1.5 rounded transition ${editor.isActive('codeBlock') ? 'bg-neutral-700 text-white' : 'text-neutral-400 hover:text-white hover:bg-neutral-800'}`}
        title="Code Block"
      >
        <Code2 className="w-4 h-4" />
      </button>

      <span className="w-px h-4 bg-neutral-700 mx-1"></span>

      <button
        type="button"
        onClick={setLink}
        className={`p-1.5 rounded transition ${editor.isActive('link') ? 'bg-neutral-700 text-white' : 'text-neutral-400 hover:text-white hover:bg-neutral-800'}`}
        title="Insert Link"
      >
        <LinkIcon className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={addImage}
        className="p-1.5 rounded transition text-neutral-400 hover:text-white hover:bg-neutral-800"
        title="Insert Image"
      >
        <ImageIcon className="w-4 h-4" />
      </button>
    </div>
  );
};

export default function RichTextEditor({ content, onChange }: { content: string, onChange: (content: string) => void }) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({
        openOnClick: false,
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Image,
      Placeholder.configure({
        placeholder: 'Write your rich text securely here...',
        emptyEditorClass: 'is-editor-empty',
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-invert prose-emerald max-w-none focus:outline-none min-h-[300px] p-4 text-neutral-200'
      }
    }
  });

  return (
    <div className="flex flex-col h-full">
      <MenuBar editor={editor} />
      <div className="flex-1 overflow-y-auto bg-neutral-800 rounded-b-xl scrollbar-thin scrollbar-thumb-neutral-600">
        <EditorContent editor={editor} className="h-full" />
      </div>
    </div>
  );
}
