'use client'

import { Breadcrumbs } from '$lib/components/common/BreadcrumbsHeader'
import { GridItems } from '$lib/components/common/GridItems'
import { DemoCleanupDialog } from '$lib/components/demo/DemoCleanupDialog'
import { DemoSetupDialog } from '$lib/components/demo/DemoSetupDialog'
import { usePipelineManagerQuery } from '$lib/compositions/usePipelineManagerQuery'
import { Fragment, useState } from 'react'
import { DemoSetup } from 'src/lib/types/demo'
import IconBrush from '~icons/bx/brush'
import IconChevronRight from '~icons/bx/chevron-right'

import { Box, Button, Card, CardActions, CardContent, Grid, IconButton, Typography } from '@mui/material'
import { useQuery } from '@tanstack/react-query'

const DemoTile = (props: { name: string; desc: string; onSetup: () => void; onCleanup: () => void }) => {
  return (
    <Card>
      <CardContent>
        <Typography variant='h5' gutterBottom>
          {props.name}
        </Typography>
        <Typography variant='body1'>{props.desc}</Typography>
      </CardContent>
      <CardActions sx={{ width: '100%', display: 'flex', justifyContent: 'space-between' }}>
        <IconButton onClick={props.onCleanup} sx={{ transform: 'rotate(180deg)' }}>
          <IconBrush fontSize={20} />
        </IconButton>
        <Button onClick={props.onSetup} variant='contained' sx={{ px: '1rem' }} endIcon={<IconChevronRight />}>
          Try
        </Button>
      </CardActions>
    </Card>
  )
}

const _fetchStaticDemoSetup = (demo: { import: string }) =>
  fetch(`/_next/static/demo/${demo.import}`).then(r => r.json()) as Promise<DemoSetup>

const fetchDemoSetup = (demo: { url: string }) => fetch(demo.url).then(r => r.json()) as Promise<DemoSetup>

export default function () {
  const [setupDemo, setSetupDemo] = useState<{ name: string; setup: DemoSetup } | undefined>()
  const [cleanupDemo, setCleanupDemo] = useState<{ name: string; setup: DemoSetup } | undefined>()
  const queryDemos = useQuery(usePipelineManagerQuery().getDemos())
  const demos = [
    {
      group: 'easy',
      label: 'Simple demos',
      demos: queryDemos.data ?? []
    }
  ]
  return (
    <>
      <Breadcrumbs.Header>
        <Breadcrumbs.Link href={`/demos/`} data-testid='button-breadcrumb-demos'>
          Demos
        </Breadcrumbs.Link>
      </Breadcrumbs.Header>
      <Box>
        <Typography variant='body1' gutterBottom>
          Setup and explore pre-made demos on your running Feldera instance
        </Typography>
        {demos.map(group => (
          <Fragment key={group.group}>
            <Typography variant='h6' gutterBottom>
              {group.label}
            </Typography>
            <Grid container spacing={2}>
              <GridItems xs={6} sm={4} md={3}>
                {group.demos.map(demo => (
                  <DemoTile
                    key={demo.title}
                    name={demo.title}
                    desc={demo.description}
                    onSetup={() => fetchDemoSetup(demo).then(setup => setSetupDemo({ name: demo.title, setup }))}
                    onCleanup={() => fetchDemoSetup(demo).then(setup => setCleanupDemo({ name: demo.title, setup }))}
                  ></DemoTile>
                ))}
              </GridItems>
            </Grid>
          </Fragment>
        ))}
      </Box>
      <DemoSetupDialog demo={setupDemo} onClose={() => setSetupDemo(undefined)}></DemoSetupDialog>
      <DemoCleanupDialog demo={cleanupDemo} onClose={() => setCleanupDemo(undefined)}></DemoCleanupDialog>
    </>
  )
}
