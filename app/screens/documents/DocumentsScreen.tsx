// Anoqi — DocumentsScreen.
//
// Nested native-stack host for the Documents tab. The tab routes here,
// this navigator handles the list ↔ add ↔ detail flow without touching
// the root MainNavigator tab bar.

import React from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'

import { DocumentsListScreen }   from './DocumentsListScreen'
import { AddDocumentScreen }     from './AddDocumentScreen'
import { DocumentDetailScreen }  from './DocumentDetailScreen'

export type DocumentsStackParamList = {
  DocumentsList:  undefined
  AddDocument:    undefined
  DocumentDetail: { id: string }
}

const Stack = createNativeStackNavigator<DocumentsStackParamList>()

export function DocumentsScreen() {
  return (
    <Stack.Navigator
      initialRouteName="DocumentsList"
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: 'transparent' },
      }}
    >
      <Stack.Screen
        name="DocumentsList"
        component={DocumentsListScreen}
      />
      <Stack.Screen
        name="AddDocument"
        component={AddDocumentScreen}
        options={{
          presentation: 'modal',
          animation:    'slide_from_bottom',
        }}
      />
      <Stack.Screen
        name="DocumentDetail"
        component={DocumentDetailScreen}
        options={{ animation: 'slide_from_right' }}
      />
    </Stack.Navigator>
  )
}
