import { IsString, IsInt, IsUUID, Min, IsOptional } from 'class-validator';

export class CreateTrackDto {
  @IsString()
  title: string;

  @IsInt()
  @Min(1)
  trackNumber: number;

  @IsUUID()
  releaseId: string;

  @IsOptional()
  @IsString()
  description?: string;
}
