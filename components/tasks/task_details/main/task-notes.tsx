'use client'

import { useState, useEffect } from 'react'
import { getMediaUrl } from "@/lib/config";
import { apiClient } from '@/lib/api-client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/layout/card'
import { Button } from '@/components/ui/core/button'
import { Textarea } from '@/components/ui/core/textarea'
import { ScrollArea } from '@/components/ui/layout/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { format } from 'date-fns'

interface TaskNotesProps {
  taskId: string
}

export function TaskNotes({ taskId }: TaskNotesProps) {
  const [notes, setNotes] = useState<any[]>([])
  const [newNote, setNewNote] = useState('')
  const [loading, setLoading] = useState(true)

  const fetchNotes = async () => {
    setLoading(true)
    try {
      const response = await apiClient.get(`/tasks/${taskId}/activities/`)
      if (response.data) {
        const filteredNotes = response.data.filter((activity: any) => activity.type === 'note')
        setNotes(filteredNotes)
      }
    } catch (error) {
      console.error('Error fetching notes:', error)
    }
    setLoading(false)
  }

  useEffect(() => {
    if (taskId) {
      fetchNotes()
    }
  }, [taskId])

  const handleAddNote = async () => {
    if (!newNote.trim()) return

    try {
      const response = await apiClient.post(`/tasks/${taskId}/add-activity/`, { message: newNote, type: 'note' })
      if (response.data) {
        setNotes([response.data, ...notes])
        setNewNote('')
      }
    } catch (error) {
      console.error('Error adding note:', error)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notes</CardTitle>
      </CardHeader>
      <CardContent>
        <div className='space-y-4'>
          <div>
            <Textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder='Add a new note...'
              className='mb-2'
            />
            <Button onClick={handleAddNote} disabled={!newNote.trim()}>
              Add Note
            </Button>
          </div>
          <ScrollArea className='h-72'>
            <div className='space-y-4'>
              {loading ? (
                <p>Loading notes...</p>
              ) : notes.length === 0 ? (
                <p>No notes found for this task.</p>
              ) : (
                notes.map((note) => (
                  <div key={note.id} className='flex items-start gap-4'>
                    <Avatar className='h-9 w-9'>
                      <AvatarImage src={getMediaUrl(note.user?.profile_picture_url)} alt='Avatar' />
                      <AvatarFallback>{note.user?.full_name?.substring(0, 2) || 'S'}</AvatarFallback>
                    </Avatar>
                    <div className='grid gap-1'>
                      <p className='text-sm font-medium leading-none'>
                        {note.user?.full_name || 'System'} <span className='text-xs text-muted-foreground'>({note.user?.role || 'System'})</span>
                      </p>
                      <p className='text-sm text-muted-foreground'>{note.message}</p>
                      <p className='text-xs text-muted-foreground'>
                        {format(new Date(note.timestamp), 'PPP p')}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  )
}